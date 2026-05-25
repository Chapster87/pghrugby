import { Button } from "@medusajs/ui"
import Heading from "@/components/typography/heading"
import Text from "@/components/typography/text"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import s from "./style.module.css"

const SignInPrompt = () => {
  return (
    <div className={s.promptWrapper}>
      <div className={s.textSection}>
        <Heading level="h2">Already have an account?</Heading>
        <Text className={s.description}>Sign in for a better experience.</Text>
      </div>
      <div className={s.buttonSection}>
        <LocalizedClientLink href="/account">
          <Button
            variant="secondary"
            className={s.signInButton}
            data-testid="sign-in-button"
          >
            Sign in
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default SignInPrompt
