/**
 * PROTOTYPE — throwaway interactive shell over orders-logic.ts. Run with
 * `pnpm prototype:orders` from pghrugby/nextjs. The shell is meant to be
 * deleted; orders-logic.ts is the portable bit.
 *
 * Push the write path through the cases that are hard to reason about on
 * paper: duplicate webhook delivery, the return-page/webhook race, a Payment
 * Link session with no cartRef, and an async (still processing) payment.
 */
import * as readline from "node:readline"
import {
  type CartPayload,
  type Order,
  type OrderStore,
  type SessionSnapshot,
  recordOrder,
} from "./orders-logic"

const BOLD = "\x1b[1m"
const DIM = "\x1b[2m"
const RESET = "\x1b[0m"

/** Fake Stripe — the subset of Checkout Sessions the orders table records. */
const SESSIONS: Record<string, SessionSnapshot> = {
  cs_dues: {
    id: "cs_dues",
    clientReferenceId: "cart_dues_1",
    currency: "usd",
    amountTotal: 23000, // $200 fall dues + $30 donation preset
    amountSubtotal: 23000,
    amountTax: null,
    paymentStatus: "paid",
    status: "complete",
    customerEmail: "player@example.com",
    customerName: "Alex Player",
    lineItems: [
      { description: "Fall Dues 2026", quantity: 1, amountTotal: 20000 },
      { description: "Club Donation $30", quantity: 1, amountTotal: 3000 },
    ],
  },
  cs_golf: {
    id: "cs_golf",
    clientReferenceId: "cart_golf_1",
    currency: "usd",
    amountTotal: 39000, // 3 golfers x $110 + mulligan + drink band
    amountSubtotal: 39000,
    amountTax: null,
    paymentStatus: "paid",
    status: "complete",
    customerEmail: "captain@example.com",
    customerName: "Casey Captain",
    lineItems: [
      { description: "Golf Outing Registration", quantity: 3, amountTotal: 33000 },
      { description: "Mulligan", quantity: 1, amountTotal: 3000 },
      { description: "All You Can Drink", quantity: 1, amountTotal: 3000 },
    ],
  },
  cs_tournament: {
    id: "cs_tournament",
    clientReferenceId: "cart_sc7s_1",
    currency: "usd",
    amountTotal: 35000,
    amountSubtotal: 35000,
    amountTax: null,
    paymentStatus: "paid",
    status: "complete",
    customerEmail: "manager@example.com",
    customerName: "Sam Manager",
    lineItems: [
      { description: "Steel City 7s - Men's Open", quantity: 1, amountTotal: 35000 },
    ],
  },
  cs_membership: {
    id: "cs_membership",
    clientReferenceId: null, // Payment Link session: no cartRef, no cart
    currency: "usd",
    amountTotal: 5000,
    amountSubtotal: 5000,
    amountTax: null,
    paymentStatus: "paid",
    status: "complete",
    customerEmail: "bronze@example.com",
    customerName: "Bo Bronze",
    lineItems: [
      { description: "Bronze Membership - monthly", quantity: 1, amountTotal: 5000 },
    ],
  },
  cs_async: {
    id: "cs_async",
    clientReferenceId: "cart_dues_2",
    currency: "usd",
    amountTotal: 20000,
    amountSubtotal: 20000,
    amountTax: null,
    paymentStatus: "processing", // async method: fast path can lock this in
    status: "complete",
    customerEmail: "paylater@example.com",
    customerName: "Pat Later",
    lineItems: [{ description: "Spring Dues 2026", quantity: 1, amountTotal: 20000 }],
  },
}

/** Registration payloads ride beside the session, keyed by cartRef. */
const CARTS: Record<string, CartPayload> = {
  cart_dues_1: { flow: "dues", registration: null },
  cart_golf_1: {
    flow: "golf",
    registration: {
      captain: { name: "Casey Captain", email: "captain@example.com" },
      golfers: [
        { name: "Casey Captain", email: "captain@example.com" },
        { name: "Riley Roster", email: "riley@example.com" },
        { name: "Jamie Tee", email: "jamie@example.com" },
      ],
    },
  },
  cart_sc7s_1: {
    flow: "tournament",
    registration: {
      teamName: "Forge Rugby SC",
      division: "men's-open",
      contact: { name: "Sam Manager", email: "manager@example.com", phone: "412-555-0134" },
    },
  },
  cart_dues_2: { flow: "dues", registration: null },
}

const store: OrderStore = new Map()
let lastResult = ""

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`
const flowOf = (session: SessionSnapshot): string => {
  const cart = session.clientReferenceId ? CARTS[session.clientReferenceId] : undefined
  return cart?.flow ?? "null"
}
const orderLine = (o: Order): string =>
  `${o.sessionId}  ${o.flow ?? "null"}  ${fmt(o.amountTotal)} ${o.currency.toUpperCase()}  payment=${o.paymentStatus}  status=${o.sessionStatus}  registration=${o.registration ? "yes" : "no"}`

function webhook(sessionId: string): string {
  const { order, inserted } = recordOrder(store, (id) => SESSIONS[id], (ref) => CARTS[ref], sessionId)
  if (inserted) {
    return `webhook INSERTED ${sessionId}:\n${JSON.stringify(order, null, 2)}`
  }
  return `webhook ${sessionId}: no-op — row already exists (returned it untouched)`
}

function fastPath(sessionId: string): string {
  const { order, inserted } = recordOrder(store, (id) => SESSIONS[id], (ref) => CARTS[ref], sessionId)
  if (inserted) {
    return `fast path INSERTED ${sessionId}:\n${JSON.stringify(order, null, 2)}`
  }
  return `fast path ${sessionId}: no-op — row already exists (returned it untouched)`
}

function render(): void {
  console.clear()
  const lines: string[] = []
  lines.push(`${BOLD}PROTOTYPE${RESET} — orders write path  (first-writer-wins upsert keyed by session_id)`)
  lines.push(DIM + "webhook = authoritative path; fast path = return page; both call the same recordOrder." + RESET)
  lines.push("")
  lines.push(`${BOLD}Orders in the store (${store.size}):${RESET}`)
  if (store.size === 0) {
    lines.push(DIM + "  (none yet)" + RESET)
  } else {
    for (const o of store.values()) {
      lines.push(`  ${orderLine(o)}`)
    }
  }
  lines.push("")
  lines.push(`${BOLD}Scenario sessions (fake Stripe):${RESET}`)
  for (const s of Object.values(SESSIONS)) {
    lines.push(
      `  ${s.id}  ${flowOf(s)}  ${fmt(s.amountTotal)} ${s.currency.toUpperCase()}  payment=${s.paymentStatus}  status=${s.status}  cartRef=${s.clientReferenceId ?? "null"}`
    )
  }
  lines.push("")
  lines.push(`${BOLD}Actions:${RESET}`)
  lines.push(DIM + "  [w <id>] webhook event      [f <id>] return-page fast path" + RESET)
  lines.push(DIM + "  [d <id>] deliver webhook twice (dup)   [p <id>] peek session + cart payload" + RESET)
  lines.push(DIM + "  [l] list full orders   [x] reset store   [q] quit" + RESET)
  lines.push("")
  lines.push(`${BOLD}Last:${RESET} ${lastResult.replace(/\n/g, "\n      ")}`)
  lines.push("")
  process.stdout.write(lines.join("\n") + "\n")
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function handle(line: string): void {
  const [cmd, arg] = line.split(/\s+/, 2)
  switch (cmd) {
    case "w":
      lastResult = arg ? webhook(arg) : "usage: w <sessionId>"
      break
    case "f":
      lastResult = arg ? fastPath(arg) : "usage: f <sessionId>"
      break
    case "d": {
      if (!arg) {
        lastResult = "usage: d <sessionId>"
        break
      }
      const first = webhook(arg)
      const second = webhook(arg)
      lastResult = `dup delivery of ${arg}:\n  1st -> ${first}\n  2nd -> ${second}`
      break
    }
    case "p": {
      if (!arg) {
        lastResult = "usage: p <sessionId>"
        break
      }
      const s = SESSIONS[arg]
      if (!s) {
        lastResult = `unknown session: ${arg}`
        break
      }
      const cart = s.clientReferenceId ? CARTS[s.clientReferenceId] : undefined
      lastResult =
        `session ${arg}:\n${JSON.stringify(s, null, 2)}\n` +
        (cart ? `cart ${s.clientReferenceId}:\n${JSON.stringify(cart, null, 2)}` : "cart: none (Payment Link)")
      break
    }
    case "l":
      lastResult =
        store.size === 0
          ? "store is empty"
          : JSON.stringify([...store.values()], null, 2)
      break
    case "x":
      store.clear()
      lastResult = "store reset"
      break
    case "q":
      rl.close()
      return
    default:
      lastResult = `unknown command: ${cmd || "(empty)"}`
  }
  ask()
}

function ask(): void {
  render()
  rl.question("> ", (answer) => handle(answer.trim()))
}

ask()
