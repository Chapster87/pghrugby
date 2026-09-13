const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i

export const getBaseURL = () => {
  const configured = process.env.NEXT_PUBLIC_BASE_URL
  // A local value inlined into a production build would leak into canonical and
  // Open Graph URLs, so prefer the URL the host publishes for this deploy
  // (Netlify sets `URL` / `DEPLOY_PRIME_URL`) whenever the configured one is a
  // developer origin.
  if (configured && !LOCAL_ORIGIN.test(configured)) return configured
  return (
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    configured ||
    "http://localhost:8000"
  )
}
