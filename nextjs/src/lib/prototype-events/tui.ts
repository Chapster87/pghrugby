/**
 * PROTOTYPE — TUI shell for the Stripe event edge-cases prototype. Throwaway.
 * The logic lives in ./events-logic.ts and is the liftable part; this shell
 * just lets a human push the state machine through realistic event sequences.
 *
 * Run: pnpm prototype:events        (interactive)
 *      pnpm prototype:events --smoke (run all five scenarios headlessly)
 */

import * as readline from "node:readline"

import {
  FROZEN_AT_FIRST_WRITE,
  MUTABLE_STATUS,
  type ChargePayload,
  type EventInput,
  type EventName,
  type HandlerOptions,
  type OrderRow,
  type RefundPayload,
  type SessionPayload,
  handleEvent,
  returnPageView,
} from "./events-logic"

const BOLD = "\x1b[1m"
const DIM = "\x1b[2m"
const RED = "\x1b[31m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const RESET = "\x1b[0m"

// --- Scenarios: a session setup plus the event sequence the human should try ---

type Scenario = {
  name: string
  flow: string
  amount: number
  suggest: string
  /** Explicit key sequence for --smoke mode. */
  keys: string[]
  /** Returns the session as Stripe currently sees it (before any row exists). */
  session: () => SessionPayload
}

const SCENARIOS: Scenario[] = [
  {
    name: "S1 Instant card — happy path",
    flow: "dues",
    amount: 5000,
    suggest: "1 (completed → paid), then v",
    keys: ["1", "v"],
    session: () => ({
      id: "cs_instant1",
      status: "open",
      payment_status: "unpaid",
      payment_intent: null,
      amount_total: 0,
      collected_information: null,
      recovered_from: null,
    }),
  },
  {
    name: "S2 Delayed ACH — succeeds",
    flow: "golf",
    amount: 12500,
    suggest:
      "1 (completed → processing), 2 (fast path), 3 (async succeeded), then v",
    keys: ["1", "2", "3", "v"],
    session: () => ({
      id: "cs_delay1",
      status: "open",
      payment_status: "unpaid",
      payment_intent: null,
      amount_total: 0,
      collected_information: null,
      recovered_from: null,
    }),
  },
  {
    name: "S3 Delayed ACH — fails",
    flow: "golf",
    amount: 12500,
    suggest: "1 (completed → processing), 4 (async failed), then v",
    keys: ["1", "4", "v"],
    session: () => ({
      id: "cs_delay2",
      status: "open",
      payment_status: "unpaid",
      payment_intent: null,
      amount_total: 0,
      collected_information: null,
      recovered_from: null,
    }),
  },
  {
    name: "S4 Refund cycle",
    flow: "tournament",
    amount: 8000,
    suggest:
      "1 (completed → paid), 6 (refund half), 7 (refund pending → succeeded), 6 (refund rest), then v",
    keys: ["1", "6", "7", "6", "v"],
    session: () => ({
      id: "cs_tourney1",
      status: "open",
      payment_status: "unpaid",
      payment_intent: null,
      amount_total: 0,
      collected_information: null,
      recovered_from: null,
    }),
  },
  {
    name: "S5 Abandoned — session expires",
    flow: "dues",
    amount: 5000,
    suggest:
      "t (toggle recordExpired on), 5 (expired), then v — flip t and repeat",
    keys: ["t", "5", "v", "t", "5", "v"],
    session: () => ({
      id: "cs_abandon1",
      status: "open",
      payment_status: "unpaid",
      payment_intent: null,
      amount_total: 0,
      collected_information: { email: "lisa@example.com", name: "Lisa" },
      recovered_from: null,
    }),
  },
]

// --- World state: the in-memory simulation ---

type World = {
  scenarioIdx: number
  row: OrderRow | null
  refundStep: number // for the 6/7 cycle keys
  lastPlans: string[]
  lastNote: string | null
  recordExpired: boolean
  session: () => SessionPayload
  amount: number
}

function newWorld(): World {
  return {
    scenarioIdx: 0,
    row: null,
    refundStep: 0,
    lastPlans: [],
    lastNote: null,
    recordExpired: false,
    session: () => SCENARIOS[0].session(),
    amount: SCENARIOS[0].amount,
  }
}

function loadScenario(world: World, idx: number): void {
  world.scenarioIdx = idx
  world.row = null
  world.refundStep = 0
  world.lastPlans = []
  world.lastNote = null
  world.amount = SCENARIOS[idx].amount
  world.session = () => ({
    ...SCENARIOS[idx].session(),
    amount_total: world.amount,
  })
}

/** Builds the event payload Stripe would send right now for the current scenario. */
function sessionPayload(
  world: World,
  status: SessionPayload["status"],
  payment: SessionPayload["payment_status"],
  paymentIntent: string | null
): SessionPayload {
  return {
    ...world.session(),
    status,
    payment_status: payment,
    payment_intent: paymentIntent,
  }
}

const PENDING_REFUND: RefundPayload = {
  id: "re_pending1",
  amount: 4000,
  status: "pending",
  reason: null,
  payment_intent: "pi_tourney1",
}
const SUCCEEDED_REFUND: RefundPayload = {
  ...PENDING_REFUND,
  status: "succeeded",
}

function dispatch(world: World, key: string): void {
  const s = SCENARIOS[world.scenarioIdx]
  const paymentIntent = `pi_${s.flow}1`
  let event: EventInput | null = null
  const opts: HandlerOptions = { recordExpired: world.recordExpired }

  switch (key) {
    case "1": // webhook checkout.session.completed (instant: paid, delayed: processing)
      event = {
        name: "checkout.session.completed",
        payload: sessionPayload(
          world,
          "complete",
          s.flow === "golf" ? "processing" : "paid",
          paymentIntent
        ),
      }
      break
    case "2": // return-page fast path — same recordOrder, fresh retrieve
      event = {
        name: "checkout.session.completed",
        payload: sessionPayload(world, "complete", "processing", paymentIntent),
      }
      break
    case "3":
      event = {
        name: "checkout.session.async_payment_succeeded",
        payload: sessionPayload(world, "complete", "paid", paymentIntent),
      }
      break
    case "4":
      event = {
        name: "checkout.session.async_payment_failed",
        payload: sessionPayload(world, "complete", "unpaid", paymentIntent),
      }
      break
    case "5":
      event = {
        name: "checkout.session.expired",
        payload: sessionPayload(world, "expired", "unpaid", null),
      }
      break
    case "6": {
      // charge.refunded: 50% then 100% of the scenario amount
      const half = Math.floor(world.amount / 2)
      const full = world.amount
      const amount = world.refundStep === 0 ? half : full
      world.refundStep++
      const charge: ChargePayload = {
        id: `ch_${s.flow}1`,
        payment_intent: paymentIntent,
        refunded: amount >= full,
        amount_refunded: amount,
        refunds: [
          { id: "re_pending1", amount, status: "pending", reason: null },
        ],
      }
      event = { name: "charge.refunded", payload: charge }
      break
    }
    case "7": // refund.created (pending) then refund.updated (succeeded)
      event = {
        name: world.refundStep % 2 === 0 ? "refund.created" : "refund.updated",
        payload: world.refundStep % 2 === 0 ? PENDING_REFUND : SUCCEEDED_REFUND,
      }
      world.refundStep++
      break
    default:
      return
  }

  const result = handleEvent(world.row, event, opts)
  world.row = result.row
  world.lastPlans = result.plans.map((p) => p.sql)
  world.lastNote =
    result.plans
      .map((p) => p.note)
      .filter(Boolean)
      .join(" | ") || null
}

// --- Rendering ---

function render(world: World): void {
  const s = SCENARIOS[world.scenarioIdx]
  const row = world.row
  const lines: string[] = []

  lines.push(
    `${BOLD}Stripe event edge cases — prototype${RESET}   ${DIM}${s.name}${RESET}`
  )
  lines.push(
    `${DIM}flow=${s.flow}  amount=$${(s.amount / 100).toFixed(
      2
    )}  recordExpired=${
      world.recordExpired ? GREEN + "on" + RESET : "off"
    }${RESET}`
  )
  lines.push(`${DIM}suggested: ${s.suggest}${RESET}`)
  lines.push("")

  // Stripe's current view of the session (pre-completion state)
  const sess = s.session()
  lines.push(
    `${BOLD}Stripe session${RESET}  id=${DIM}${
      sess.id
    }${RESET}  recovered_from=${sess.recovered_from ?? "null"}`
  )
  lines.push(
    `${DIM}collected_information: ${JSON.stringify(
      sess.collected_information
    )}${RESET}`
  )
  lines.push("")

  // Orders row
  if (!row) {
    lines.push(`${BOLD}orders row${RESET}  ${RED}— none yet${RESET}`)
  } else {
    lines.push(
      `${BOLD}orders row${RESET}  (${DIM}session_id=${row.session_id}${RESET})`
    )
    const flag = (v: unknown, mutable: boolean) =>
      `${mutable ? YELLOW : DIM}${String(v)}${RESET}${mutable ? " *" : ""}`
    lines.push(`  payment_status:   ${flag(row.payment_status, true)}`)
    lines.push(`  session_status:   ${flag(row.session_status, true)}`)
    lines.push(`  payment_intent_id:${flag(row.payment_intent_id, false)}`)
    lines.push(
      `  refunded_amount:  ${flag(
        row.refunded_amount,
        true
      )}  refund_status: ${flag(row.refund_status, true)}`
    )
    lines.push(`  refunds:          ${flag(JSON.stringify(row.refunds), true)}`)
    lines.push(
      `${DIM}  frozen at first write: amount_total=${
        row.amount_total
      }, ${FROZEN_AT_FIRST_WRITE.filter(
        (c) => c !== "session_id" && c !== "amount_total"
      ).join(", ")}${RESET}`
    )
    lines.push(`${DIM}  mutable status: ${MUTABLE_STATUS.join(", ")}${RESET}`)
  }
  lines.push("")

  // Last write plan(s)
  if (world.lastPlans.length) {
    lines.push(`${BOLD}last write plan${RESET}`)
    for (const sql of world.lastPlans) {
      lines.push(`${DIM}${sql}${RESET}`)
    }
    if (world.lastNote) lines.push(`${YELLOW}↳ ${world.lastNote}${RESET}`)
    lines.push("")
  }

  // Return page view
  const view = returnPageView(row)
  lines.push(`${BOLD}/checkout/success view${RESET}`)
  lines.push(`  ${GREEN}${view.heading}${RESET}`)
  lines.push(`  ${DIM}${view.message}${RESET}`)
  lines.push(`  ${DIM}cta: ${view.cta}${RESET}`)
  lines.push("")

  lines.push(
    `${BOLD}[n]${RESET}${DIM} scenario ${RESET}  ${BOLD}[1]${RESET}${DIM} completed ${RESET}  ${BOLD}[2]${RESET}${DIM} fast path ${RESET}  ${BOLD}[3]${RESET}${DIM} async ok ${RESET}  ${BOLD}[4]${RESET}${DIM} async fail ${RESET}`
  )
  lines.push(
    `${BOLD}[5]${RESET}${DIM} expired ${RESET}  ${BOLD}[6]${RESET}${DIM} charge.refunded ${RESET}  ${BOLD}[7]${RESET}${DIM} refund.created→updated ${RESET}  ${BOLD}[t]${RESET}${DIM} recordExpired ${RESET}  ${BOLD}[q]${RESET}${DIM} quit${RESET}`
  )

  console.clear()
  process.stdout.write(lines.join("\n") + "\n")
}

// --- Smoke mode: run all scenarios headlessly ---

function smoke(): void {
  for (let i = 0; i < SCENARIOS.length; i++) {
    const world = newWorld()
    loadScenario(world, i)
    const s = SCENARIOS[i]
    console.log(`\n=== ${s.name} ===`)
    for (const key of s.keys) {
      if (key === "t") {
        world.recordExpired = !world.recordExpired
        console.log(`  [t] recordExpired → ${world.recordExpired}`)
        continue
      }
      if (key === "v") {
        console.log(`  view → ${returnPageView(world.row).heading}`)
        continue
      }
      dispatch(world, key)
      const last = world.lastPlans[world.lastPlans.length - 1]
      const row = world.row
      console.log(`  [${key}] ${last?.split("\n")[0] ?? "(no write)"}`)
      if (row) {
        console.log(
          `        payment=${row.payment_status} session=${row.session_status} refunded=${row.refunded_amount}/${row.amount_total} (${row.refund_status})`
        )
      }
      if (world.lastNote) console.log(`        ↳ ${world.lastNote}`)
    }
  }
}

// --- Input ---

let rl: readline.Interface | null = null

function setupInput(): { read: () => Promise<string>; close: () => void } {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding("utf8")
    let buffer = ""
    return {
      read: () =>
        new Promise((resolve) => {
          const onData = (chunk: string) => {
            buffer += chunk
            // Single-key commands; allow backspace-free entry. Read one char.
            const ch = buffer[0]
            buffer = buffer.slice(1)
            process.stdin.removeListener("data", onData)
            resolve(ch)
          }
          process.stdin.on("data", onData)
        }),
      close: () => process.stdin.setRawMode(false),
    }
  }
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return {
    read: () =>
      new Promise((resolve) =>
        rl!.once("line", (line) => resolve(line.trim() || "n"))
      ),
    close: () => rl?.close(),
  }
}

async function main(): Promise<void> {
  if (process.argv.includes("--smoke")) {
    smoke()
    return
  }

  const world = newWorld()
  loadScenario(world, 0)
  const input = setupInput()
  render(world)

  for (;;) {
    const key = (await input.read()).toLowerCase()
    if (key === "q") break
    if (key === "n")
      loadScenario(world, (world.scenarioIdx + 1) % SCENARIOS.length)
    else if (key === "t") world.recordExpired = !world.recordExpired
    else dispatch(world, key)
    render(world)
  }

  input.close()
  console.clear()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
