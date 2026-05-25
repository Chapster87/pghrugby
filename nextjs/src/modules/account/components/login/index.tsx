import { login } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import Heading from "@/components/typography/heading"
import Text from "@/components/typography/text"
import { useActionState } from "react"

import s from "./style.module.css"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Login = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(login, null)

  return (
    <div className={s.loginWrapper} data-testid="login-page">
      <Heading level="h1" display="h6" className={s.title}>
        Welcome back
      </Heading>
      <Text className={s.description}>
        Sign in to access an enhanced shopping experience.
      </Text>
      <form className={s.form} action={formAction}>
        <div className={s.inputGroup}>
          <Input
            label="Email"
            name="email"
            type="email"
            title="Enter a valid email address."
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="password-input"
          />
        </div>
        <ErrorMessage error={message} data-testid="login-error-message" />
        <SubmitButton data-testid="sign-in-button" className={s.submitButton}>
          Sign in
        </SubmitButton>
      </form>
      <Text variant="span" className={s.footer}>
        Not a member?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className={s.linkButton}
          data-testid="register-button"
        >
          Join us
        </button>
        .
      </Text>
    </div>
  )
}

export default Login
