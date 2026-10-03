/**
 * Fetches the pinned PostgREST binary for this platform into `.local/postgrest/`.
 *
 * The integration layer needs the app's real transport — PostgREST over HTTP —
 * and PostgREST is a single self-contained executable published on GitHub
 * releases, so the repo provisions it rather than requiring Docker (map #126
 * decision 3). Postgres itself is a documented prerequisite.
 *
 * Idempotent: a second call finds the binary already extracted and does nothing.
 * Run directly (`node scripts/db/postgrest.mjs`) or via the stack's global setup.
 */

import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { access, chmod, mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

/** Pinned so local and CI fetch the same build. */
export const POSTGREST_VERSION = "16.4"

const REPO_ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)))
const INSTALL_DIR = path.join(REPO_ROOT, ".local", "postgrest")

/** Platform/arch -> release asset filename, or a clear error when unsupported. */
function assetName(platform = process.platform, arch = process.arch) {
  const table = {
    "win32:x64": `postgrest-v${POSTGREST_VERSION}-windows-x86-64.zip`,
    "linux:x64": `postgrest-v${POSTGREST_VERSION}-linux-static-x86-64.tar.xz`,
    "linux:arm64": `postgrest-v${POSTGREST_VERSION}-linux-static-aarch64.tar.xz`,
    "darwin:x64": `postgrest-v${POSTGREST_VERSION}-macos-x86-64.tar.xz`,
    "darwin:arm64": `postgrest-v${POSTGREST_VERSION}-macos-aarch64.tar.xz`,
  }

  const asset = table[`${platform}:${arch}`]
  if (!asset) {
    throw new Error(
      `No PostgREST v${POSTGREST_VERSION} build for ${platform}/${arch}. ` +
        `Install PostgREST yourself and set POSTGREST_BIN, or add the asset to ` +
        `scripts/db/postgrest.mjs.`
    )
  }
  return asset
}

/** Absolute path to the extracted executable. */
export function postgrestBinaryPath() {
  const exe = process.platform === "win32" ? "postgrest.exe" : "postgrest"
  return path.join(INSTALL_DIR, exe)
}

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

/**
 * The tar to extract with. On Windows the shell's `tar` is often Git's GNU tar,
 * which cannot read `.zip`; `%SystemRoot%\System32\tar.exe` is bsdtar and can.
 * macOS ships bsdtar too; Linux's tar reads `.tar.xz`.
 */
function tarCommand() {
  if (process.platform === "win32") {
    const root = process.env.SystemRoot || "C:\\Windows"
    const sysTar = path.join(root, "System32", "tar.exe")
    try {
      if (existsSync(sysTar)) return sysTar
    } catch {
      /* fall through to `tar` on PATH */
    }
  }
  return "tar"
}

function extract(archivePath, into) {
  // Run with `cwd` and a bare filename: a Windows absolute path (`C:\…`) would
  // be read by tar as `host:path` and fail with "Cannot connect to C".
  const res = spawnSync(tarCommand(), ["-xf", path.basename(archivePath)], {
    cwd: into,
    stdio: "inherit",
  })
  if (res.error) {
    throw new Error(
      `Could not run \`tar\` to extract ${path.basename(archivePath)}: ${
        res.error.message
      }`
    )
  }
  if (res.status !== 0) {
    throw new Error(
      `\`tar\` failed to extract ${path.basename(archivePath)} (exit ${
        res.status
      }). ` + `On Linux ensure xz-utils and tar are installed.`
    )
  }
}

/**
 * Ensures the pinned PostgREST binary is present, downloading and extracting it
 * on first use. Honors `POSTGREST_BIN` as an escape hatch (a system install).
 *
 * @returns {Promise<string>} absolute path to the executable.
 */
export async function ensurePostgrest() {
  if (process.env.POSTGREST_BIN) return process.env.POSTGREST_BIN

  const binary = postgrestBinaryPath()
  if (await exists(binary)) return binary

  const asset = assetName()
  const url = `https://github.com/PostgREST/postgrest/releases/download/v${POSTGREST_VERSION}/${asset}`

  await mkdir(INSTALL_DIR, { recursive: true })
  const archive = path.join(INSTALL_DIR, asset)

  console.log(`[postgrest] downloading ${asset} …`)
  if (!(await exists(archive))) {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Failed to download ${url} (HTTP ${res.status})`)
    }
    await writeFile(archive, Buffer.from(await res.arrayBuffer()))
  }

  console.log("[postgrest] extracting …")
  extract(archive, INSTALL_DIR)
  await rm(archive, { force: true })

  // A tarball's mode bits survive extraction; a zip's do not. Make sure.
  if (process.platform !== "win32") {
    await chmod(binary, 0o755)
  }

  if (!(await exists(binary))) {
    throw new Error(
      `Extracted ${asset} but ${path.basename(binary)} was not produced in ` +
        `${INSTALL_DIR}. The release layout may have changed.`
    )
  }

  console.log(`[postgrest] ready at ${binary}`)
  return binary
}

// Allow `node scripts/db/postgrest.mjs` as a standalone provisioning step.
if (process.argv[1] && path.basename(process.argv[1]) === "postgrest.mjs") {
  ensurePostgrest().catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
}
