import Heading from "../components/typography/heading"
import AuthForm from "./_components/auth-form"
import s from "./style.module.css"

/**
 * Locked-down authentication page.
 * Rendered on a black full-viewport shell without admin chrome.
 */
export default function AuthPage() {
  return (
    <div className={s.page}>
      <Heading level="h1" display="h2" className={s.title}>
        Sign In
      </Heading>
      <AuthForm />
    </div>
  )
}
