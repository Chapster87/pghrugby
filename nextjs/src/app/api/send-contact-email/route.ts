import { NextResponse } from "next/server"
import { Resend } from "resend"

/**
 * Contact-form email via Resend.
 * API key is server-only (RESEND_API_KEY) — never NEXT_PUBLIC_.
 * From-address must be a verified domain sender; submitter goes on replyTo.
 */
const resend = new Resend(process.env.RESEND_API_KEY)

const DEFAULT_FROM_EMAIL = "web@pghrugby.com"

// Map context values to designated email addresses
const CONTEXT_EMAILS: Record<string, string> = {
  // general: "club@pghrugby.com",
  // "womens-membership": "womensmembership@pghrugby.com",
  // "mens-membership": "mensmembership@pghrugby.com",
  // "womens-matchsec": "womensmatchsec@pghrugby.com",
  // "mens-matchsec": "mensmatchsec@pghrugby.com",
  // website: "web@pghrugby.com",
  general: "admin+general@pghrugby.com",
  "womens-membership": "admin+womensmembership@pghrugby.com",
  "mens-membership": "admin+mensmembership@pghrugby.com",
  "womens-matchsec": "admin+womensmatchsec@pghrugby.com",
  "mens-matchsec": "admin+mensmatchsec@pghrugby.com",
  website: "admin+website@pghrugby.com",
}

const CONTEXT_SUBJECTS: Record<string, string> = {
  general: "General Club Inquiry",
  "womens-membership": "Women's Team Membership",
  "mens-membership": "Men's Team Membership",
  "womens-matchsec": "Women's Match Secretary",
  "mens-matchsec": "Men's Match Secretary",
  website: "Website Question or Technical Issue",
}

/**
 * POST /api/send-contact-email
 * Sends a club contact-form message via Resend.
 *
 * @param req - JSON body: { name, email, message, context }
 * @returns Success JSON or an error payload with HTTP status
 */
export async function POST(req: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not set" },
        { status: 500 }
      )
    }

    const { name, email, message, context } = await req.json()
    const to = CONTEXT_EMAILS[context] || CONTEXT_EMAILS["general"]
    const fromAddress = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL
    const from = `Pittsburgh Forge Rugby Club <${fromAddress}>`

    const subject = `Website Message - From: ${
      CONTEXT_SUBJECTS[context] || CONTEXT_SUBJECTS["general"]
    }`
    const html = `<p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong><br/>${message}</p>`

    const data = await resend.emails.send({
      from,
      to,
      replyTo: email ? `${name} <${email}>` : undefined,
      subject,
      html,
    })

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    )
  }
}
