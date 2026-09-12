"use client"

import { useRef, useState } from "react"
import Link from "@components/link"
import Heading from "@components/typography/heading"
import Button from "@components/button"
import { FaFacebook, FaInstagram, FaTwitter } from "react-icons/fa6"
import ReCAPTCHA from "react-google-recaptcha"
import Field from "@components/field"
import Form from "@components/form"
import s from "./style.module.css"

export type SocialMedia = {
  facebookUrl: string
  instagramUrl: string
  twitterUrl: string
}

export default function ContactForm({
  socialsData,
}: {
  socialsData?: SocialMedia
}) {
  const recaptchaRef = useRef<ReCAPTCHA>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [captchaError, setCaptchaError] = useState("")
  const [formStatus, setFormStatus] = useState<string>("")
  const [resetKey, setResetKey] = useState<number>(0)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const recaptchaValue = recaptchaRef.current?.getValue()
    if (!recaptchaValue) {
      setCaptchaError("Please verify you are not a robot.")
      return
    }
    setCaptchaError("")

    const formData = new FormData(event.currentTarget)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const message = formData.get("message") as string
    const context =
      (formData.get("concerned_department") as string) || "general"

    try {
      const res = await fetch("/api/send-contact-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, context }),
      })
      const result = await res.json()
      if (result.success) {
        setFormStatus("Message sent successfully!")
        if (formRef.current) formRef.current.reset()
        if (recaptchaRef.current) recaptchaRef.current.reset()
        setResetKey((prev) => prev + 1)
      } else {
        let errorMsg = "Failed to send message."
        if (result.error) {
          if (typeof result.error === "string") {
            errorMsg = result.error
          } else if (typeof result.error === "object" && result.error.message) {
            errorMsg = result.error.message
          } else {
            errorMsg = JSON.stringify(result.error)
          }
        }
        setFormStatus(errorMsg)
      }
    } catch (err: any) {
      setFormStatus(err?.message || "Failed to send message.")
    }
  }

  return (
    <div className={s.contactMethods}>
      <div className={s.socialMedia}>
        <Heading level="h3" className={s.socialHeading}>
          Social Media
        </Heading>
        <ul className={s.socialLinks}>
          {socialsData && (
            <>
              {socialsData.facebookUrl && (
                <li>
                  <Link
                    href={socialsData.facebookUrl}
                    target="_blank"
                    className={s.socialLink}
                  >
                    <FaFacebook
                      size={40}
                      className={`${s.icon} ${s.facebook}`}
                    />
                  </Link>
                </li>
              )}
              {socialsData.instagramUrl && (
                <li>
                  <Link
                    href={socialsData.instagramUrl}
                    target="_blank"
                    className={s.socialLink}
                  >
                    <FaInstagram
                      size={40}
                      className={`${s.icon} ${s.instagram}`}
                    />
                  </Link>
                </li>
              )}
              {socialsData.twitterUrl && (
                <li>
                  <Link
                    href={socialsData.twitterUrl}
                    target="_blank"
                    className={s.socialLink}
                  >
                    <FaTwitter size={40} className={`${s.icon} ${s.twitter}`} />
                  </Link>
                </li>
              )}
            </>
          )}
        </ul>
      </div>
      <div className={s.contactForm}>
        <Heading level="h3" className={s.formHeading}>
          Contact Form
        </Heading>
        <Form.Root onSubmit={handleSubmit} ref={formRef} key={resetKey}>
          {formStatus && (
            <div
              style={{
                color:
                  typeof formStatus === "string" &&
                  formStatus.includes("success")
                    ? "green"
                    : "red",
                marginBottom: "8px",
              }}
            >
              {formStatus}
            </div>
          )}
          <Field.Root name="name">
            <div className={s.formFieldLabelWrapper}>
              <Field.Label required>Name</Field.Label>
              <Field.Message match="valueMissing">
                Please enter Name
              </Field.Message>
            </div>
            <Field.Control asChild>
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                required
                autoComplete="name"
              />
            </Field.Control>
          </Field.Root>
          <Field.Root name="email">
            <div className={s.formFieldLabelWrapper}>
              <Field.Label required>Email</Field.Label>
              <Field.Message match="valueMissing">
                Please enter Email
              </Field.Message>
            </div>
            <Field.Control asChild>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="visitor@email.com"
                required
                autoComplete="email"
              />
            </Field.Control>
          </Field.Root>
          <Field.Root name="context">
            <div className={s.formFieldLabelWrapper}>
              <Field.Label required>Context for Message</Field.Label>
              <Field.Message match="valueMissing">
                Please select a message context
              </Field.Message>
            </div>
            <Field.Control asChild>
              <select
                name="concerned_department"
                required
                defaultValue="general"
              >
                <optgroup label="General">
                  <option value="general">General Club Inquiry</option>
                </optgroup>
                <optgroup label="Membership">
                  <option value="womens-membership">
                    Women's Team Membership
                  </option>
                  <option value="mens-membership">Men's Team Membership</option>
                </optgroup>
                <optgroup label="Match Scheduling">
                  <option value="womens-matchsec">
                    Women's Match Secretary
                  </option>
                  <option value="mens-matchsec">Men's Match Secretary</option>
                </optgroup>
                <optgroup label="Website">
                  <option value="website">
                    Website Question or Technical Issue
                  </option>
                </optgroup>
              </select>
            </Field.Control>
          </Field.Root>
          <Field.Root name="message">
            <div className={s.formFieldLabelWrapper}>
              <Field.Label required>Message</Field.Label>
            </div>
            <Field.Control asChild>
              <textarea
                id="message"
                name="message"
                placeholder="What's up?"
                required
                rows={7}
              />
            </Field.Control>
          </Field.Root>

          <div style={{ margin: "16px 0" }}>
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY}
            />
            {captchaError && (
              <div style={{ color: "red", marginTop: "8px" }}>
                {captchaError}
              </div>
            )}
          </div>
          <Form.Submit asChild>
            <Button>Send</Button>
          </Form.Submit>
        </Form.Root>
      </div>
    </div>
  )
}
