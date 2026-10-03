/**
 * The local integration stack: a throwaway Postgres cluster seeded from
 * `supabase/migrations/`, fronted by the app's real transport, PostgREST.
 *
 * Why not `supabase start`: it needs Docker, and the app's entire Supabase
 * surface is PostgREST (`src/lib/checkout/supabase.ts` — no auth, storage or
 * realtime). The migrations are plain Postgres (RLS enabled with no policies),
 * so a vanilla cluster reproduces them exactly. Postgres is a documented
 * prerequisite; PostgREST is fetched by `scripts/db/postgrest.mjs`.
 *
 * Ports and the (non-secret, local-only) JWT are fixed so the test environment
 * is static — Vitest's config can name them without a running stack.
 */

import { spawn, spawnSync } from "node:child_process"
import { createHmac } from "node:crypto"
import { closeSync, existsSync, openSync, readdirSync } from "node:fs"
import { createServer, request as httpRequest } from "node:http"
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { ensurePostgrest } from "./postgrest.mjs"

export const REPO_ROOT = path.resolve(
  fileURLToPath(new URL("../..", import.meta.url))
)

/** Ports chosen away from the usual 5432/3000 so a local server is not touched. */
export const PG_PORT = 54329
/**
 * Supabase exposes PostgREST under `/rest/v1`; plain PostgREST serves at the root
 * and has no base-path setting. So PostgREST itself listens on an internal port
 * and a tiny loopback proxy (below) presents it on `SUPABASE_PORT` under the
 * `/rest/v1` mount the app's transport (`src/lib/checkout/supabase.ts`) expects.
 */
const POSTGREST_PORT = 54331
export const SUPABASE_PORT = 54330
export const SUPABASE_URL = `http://127.0.0.1:${SUPABASE_PORT}`
const POSTGREST_URL = `http://127.0.0.1:${POSTGREST_PORT}`

/** Local-only JWT signing secret — never a real credential. */
const JWT_SECRET = "pghrugby-local-integration-secret-at-least-32-chars"

/** Far-future expiry so the deterministic token never lapses mid-run. */
const JWT_EXP = 4102444800 // 2100-01-01

const LOCAL_DIR = path.join(REPO_ROOT, ".local")
const PGDATA = path.join(LOCAL_DIR, "pgdata")
const PG_LOG = path.join(LOCAL_DIR, "postgres.log")
const POSTGREST_CONF = path.join(LOCAL_DIR, "postgrest.conf")
const POSTGREST_LOG = path.join(LOCAL_DIR, "postgrest.log")
const MIGRATIONS_DIR = path.join(REPO_ROOT, "supabase", "migrations")

const b64url = (input) => Buffer.from(input).toString("base64url")

/**
 * A deterministic HS256 JWT carrying `role: postgres`.
 *
 * `postgres` is the cluster superuser, so it bypasses the RLS-with-no-policies
 * the migrations enable — which is exactly how Supabase's service role behaves.
 * The token is derived from a fixed secret and payload, so both the stack and
 * the Vitest config compute the same string without coordinating.
 */
export function serviceRoleKey() {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const payload = b64url(JSON.stringify({ role: "postgres", exp: JWT_EXP }))
  const signature = createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url")
  return `${header}.${payload}.${signature}`
}

/**
 * Locates a PostgreSQL executable. On Linux the server binaries (`initdb`,
 * `pg_ctl`) live under `/usr/lib/postgresql/<version>/bin` and are not on PATH —
 * CI runners included — so fall back to the newest versioned directory there.
 */
function resolvePgTool(name) {
  const onPath = spawnSync(name, ["--version"], { stdio: "ignore" })
  if (!onPath.error && onPath.status === 0) return name

  const base = "/usr/lib/postgresql"
  if (existsSync(base)) {
    for (const version of readdirSync(base).sort().reverse()) {
      const candidate = path.join(base, version, "bin", name)
      if (existsSync(candidate)) return candidate
    }
  }
  return name
}

/** Runs a PostgreSQL command, inheriting stdio, and throws with context on failure. */
function run(tool, args, label) {
  const command = resolvePgTool(tool)
  const res = spawnSync(command, args, { stdio: "inherit" })
  if (res.error) {
    throw new Error(
      `Could not run \`${command}\` (${label}): ${res.error.message}. ` +
        `Is PostgreSQL installed? It is a prerequisite of the integration layer.`
    )
  }
  if (res.status !== 0) {
    throw new Error(`\`${command}\` failed (${label}) with exit ${res.status}`)
  }
}

/** Waits until PostgREST answers its OpenAPI root, or times out. */
async function waitForPostgrest(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${POSTGREST_URL}/`)
      if (res.status === 200) return
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(
    `PostgREST did not become ready at ${POSTGREST_URL} within ${timeoutMs}ms. ` +
      `See ${POSTGREST_LOG}.`
  )
}

let postgrestChild = null
let proxyServer = null

/**
 * Starts the loopback proxy that mounts PostgREST under `/rest/v1`, matching
 * Supabase. A request to `/rest/v1/<table>` is forwarded to PostgREST's root
 * (`/<table>`); everything else passes through unchanged (so the `/` health
 * check still answers). Bodies and all headers stream through untouched, so
 * every verb the transport uses works the same.
 */
function startProxy() {
  proxyServer = createServer((req, res) => {
    const url = req.url ?? "/"
    const mount = url.match(/^\/rest\/v1(?=\/|\?|$)/)
    const stripped = mount ? url.slice(mount[0].length) || "/" : url
    const path = stripped.startsWith("/") ? stripped : `/${stripped}`

    const proxyReq = httpRequest(
      {
        host: "127.0.0.1",
        port: POSTGREST_PORT,
        method: req.method,
        path,
        headers: req.headers,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers)
        proxyRes.pipe(res)
      }
    )
    proxyReq.on("error", () => {
      if (!res.headersSent) res.writeHead(502)
      res.end()
    })
    req.pipe(proxyReq)
  })

  return new Promise((resolve, reject) => {
    proxyServer.once("error", reject)
    proxyServer.listen(SUPABASE_PORT, "127.0.0.1", () => resolve())
  })
}

/**
 * Starts the stack. Idempotent per process: a second call is a no-op while the
 * stack is running.
 *
 * @returns {Promise<{ url: string, serviceRoleKey: string }>}
 */
export async function startStack() {
  if (postgrestChild)
    return { url: SUPABASE_URL, serviceRoleKey: serviceRoleKey() }

  const postgrest = await ensurePostgrest()

  await mkdir(LOCAL_DIR, { recursive: true })
  await rm(PGDATA, { recursive: true, force: true })

  // A fresh cluster per run; `trust` auth because it only listens on loopback.
  run(
    "initdb",
    ["-D", PGDATA, "-U", "postgres", "-A", "trust", "-E", "UTF8", "--locale=C"],
    "initdb"
  )

  // Debian/Ubuntu PostgreSQL defaults its unix socket to /var/run/postgresql,
  // which the CI runner user cannot write to — the server then fails to start.
  // Put the socket in the throwaway directory instead. (Windows has no unix
  // sockets, so the flag is Linux/macOS only.)
  const sockDir = path.join(LOCAL_DIR, "pgsock")
  await mkdir(sockDir, { recursive: true })
  const serverOptions =
    `-p ${PG_PORT} -c listen_addresses=127.0.0.1` +
    (process.platform === "win32"
      ? ""
      : ` -c unix_socket_directories=${sockDir}`)

  try {
    run(
      "pg_ctl",
      [
        "-D",
        PGDATA,
        "-l",
        PG_LOG,
        "-o",
        serverOptions,
        "-w",
        "-t",
        "60",
        "start",
      ],
      "pg_ctl start"
    )
  } catch (err) {
    // Surface the server log; otherwise a startup failure is opaque in CI.
    const log = await readFile(PG_LOG, "utf8").catch(() => "")
    console.error(`[stack] Postgres failed to start. ${PG_LOG}:\n${log}`)
    throw err
  }

  // Apply every migration in filename (timestamp) order.
  const migrations = (await readdir(MIGRATIONS_DIR))
    .filter((name) => name.endsWith(".sql"))
    .sort()
  for (const name of migrations) {
    run(
      "psql",
      [
        "-h",
        "127.0.0.1",
        "-p",
        String(PG_PORT),
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-q",
        "-f",
        path.join(MIGRATIONS_DIR, name),
      ],
      `apply ${name}`
    )
  }

  await rm(POSTGREST_CONF, { force: true })
  const conf = [
    `db-uri = "postgres://postgres@127.0.0.1:${PG_PORT}/postgres"`,
    `db-schemas = "public"`,
    `db-anon-role = "postgres"`,
    `jwt-secret = "${JWT_SECRET}"`,
    `server-host = "127.0.0.1"`,
    `server-port = ${POSTGREST_PORT}`,
  ].join("\n")
  await writeFile(POSTGREST_CONF, `${conf}\n`)

  const logFd = openSync(POSTGREST_LOG, "w")
  postgrestChild = spawn(postgrest, [POSTGREST_CONF], {
    stdio: ["ignore", logFd, logFd],
  })
  closeSync(logFd)
  postgrestChild.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.error(
        `[stack] PostgREST exited with code ${code}; see ${POSTGREST_LOG}`
      )
    }
  })

  await waitForPostgrest()
  await startProxy()
  console.log(
    `[stack] ready — PostgREST on ${SUPABASE_URL} (/rest/v1), Postgres on :${PG_PORT}`
  )

  return { url: SUPABASE_URL, serviceRoleKey: serviceRoleKey() }
}

/** Stops PostgREST and the cluster, and removes the throwaway data directory. */
export async function stopStack() {
  if (postgrestChild) {
    postgrestChild.kill()
    postgrestChild = null
  }

  if (proxyServer) {
    proxyServer.closeAllConnections?.()
    await new Promise((resolve) => proxyServer.close(resolve))
    proxyServer = null
  }

  // Ignore stop failures: teardown must not mask a test failure.
  spawnSync(
    resolvePgTool("pg_ctl"),
    ["-D", PGDATA, "-m", "immediate", "-w", "-t", "30", "stop"],
    {
      stdio: "ignore",
    }
  )
  await rm(PGDATA, { recursive: true, force: true })
}
