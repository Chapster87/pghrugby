"use client"

import { useActionState } from "react"
import Input from "@modules/common/components/input"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Heading from "@/components/typography/heading"
import Text from "@/components/typography/text"
import { signup } from "@lib/data/customer"

import s from "./style.module.css"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Register = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(signup, null)

  return (
    <div className={s.registerWrapper} data-testid="register-page">
      <Heading level="h1" display="h6" className={s.title}>
        Become a Medusa Store Member
      </Heading>
      <Text className={s.description}>
        Create your Medusa Store Member profile, and get access to an enhanced
        shopping experience.
      </Text>
      <form className={s.form} action={formAction}>
        <div className={s.inputGroup}>
          <Input
            label="First name"
            name="first_name"
            required
            autoComplete="given-name"
            data-testid="first-name-input"
          />
          <Input
            label="Last name"
            name="last_name"
            required
            autoComplete="family-name"
            data-testid="last-name-input"
          />
          <Input
            label="Email"
            name="email"
            required
            type="email"
            autoComplete="email"
            data-testid="email-input"
          />
          <Input
            label="Phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            data-testid="phone-input"
          />
          <Input
            label="Password"
            name="password"
            required
            type="password"
            autoComplete="new-password"
            data-testid="password-input"
          />
        </div>
        <ErrorMessage error={message} data-testid="register-error" />
        <Text className={s.legalText}>
          By creating an account, you agree to Medusa Store's{" "}
          <LocalizedClientLink
            href="/content/privacy-policy"
            className={s.link}
          >
            Privacy Policy
          </LocalizedClientLink>{" "}
          and{" "}
          <LocalizedClientLink href="/content/terms-of-use" className={s.link}>
            Terms of Use
          </LocalizedClientLink>
          .
        </Text>
        <SubmitButton className={s.submitButton} data-testid="register-button">
          Join
        </SubmitButton>
      </form>
      <Text className={s.footer}>
        Already a member?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className={s.linkButton}
        >
          Sign in
        </button>
        .
      </Text>
    </div>
  )
}

export default Register
