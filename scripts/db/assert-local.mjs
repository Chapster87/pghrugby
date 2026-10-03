/**
 * Guards the integration suite against ever touching a real Supabase project.
 *
 * The Vitest config already points `NEXT_PUBLIC_SUPABASE_URL` at the local stack
 * and keeps `.env.local` out of scope, but the suite *writes rows*, so this
 * asserts the destination is loopback before any test runs. A non-loopback (or
 * unset) URL aborts the whole run — there is no such thing as a partially safe
 * write.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(url)) {
  throw new Error(
    `Refusing to run the integration suite: NEXT_PUBLIC_SUPABASE_URL is ` +
      `"${url || "(unset)"}", which is not loopback. These tests write orders and ` +
      `carts and must never reach a real project.`
  )
}
