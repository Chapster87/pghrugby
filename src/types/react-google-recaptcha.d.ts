/**
 * Minimal ambient types for `react-google-recaptcha`, which ships no
 * declarations (`@types/react-google-recaptcha` is not installed). Covers the
 * API this project uses: the component, its `sitekey` prop, and the instance
 * methods called through a ref.
 */
declare module "react-google-recaptcha" {
  import * as React from "react"

  export interface ReCAPTCHAProps {
    sitekey?: string
    onChange?: (token: string | null) => void
    onExpired?: () => void
    onErrored?: () => void
    theme?: "light" | "dark"
    size?: "compact" | "normal" | "invisible"
    badge?: "bottomright" | "bottomleft" | "inline"
    tabindex?: number
    hl?: string
  }

  export default class ReCAPTCHA extends React.Component<ReCAPTCHAProps> {
    getValue(): string | null
    getWidgetId(): number | null
    reset(widgetId?: number): void
    execute(): void
    executeAsync(): Promise<string>
  }
}
