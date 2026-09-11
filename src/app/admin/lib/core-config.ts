/**
 * Core configuration for the embeddable CMS.
 *
 * A consumer mounts the core without editing it; these values are the knobs a
 * host turns to brand and orient the core. All of them ship with neutral,
 * runnable defaults so a fresh mount works out of the box, and each can be
 * overridden by environment without touching core source.
 *
 * Only `NEXT_PUBLIC_*` variables are read here so the same module is safe to
 * import from both server (route handlers, schema generation) and client
 * (admin chrome) code.
 */
export const coreConfig = {
  /** Branding surfaced in the core admin chrome (header, nav wordmark). */
  branding: {
    /** Product/site name shown in the admin header and nav wordmark. */
    productName:
      process.env.NEXT_PUBLIC_CMS_PRODUCT_NAME || "Content Management",
  },

  /**
   * Storage-provider selection for the media library.
   *
   * Neutral by default: core ships no provider. A host names its provider via
   * `NEXT_PUBLIC_CMS_MEDIA_PROVIDER`, or (for the standalone demo, which
   * registers exactly one) leaves it unset and the media seam uses that sole
   * registration. Core never assumes a provider id here.
   */
  media: {
    /** Active provider id; the media seam resolves the matching registration. */
    provider: process.env.NEXT_PUBLIC_CMS_MEDIA_PROVIDER || "",
  },

  /**
   * Whether/how the CDA exposes the site- and social-settings query surface
   * read from the `globals` registry. Enabled by default; a host can disable a
   * surface it does not use or point it at its own globals keys.
   */
  cda: {
    siteSettings: {
      enabled:
        (process.env.NEXT_PUBLIC_CMS_CDA_SITE_SETTINGS ?? "true") !== "false",
      globalKey:
        process.env.NEXT_PUBLIC_CMS_GLOBALS_SITE_SETTINGS_KEY ||
        "site_settings",
    },
    socialSettings: {
      enabled:
        (process.env.NEXT_PUBLIC_CMS_CDA_SOCIAL_SETTINGS ?? "true") !== "false",
      globalKey:
        process.env.NEXT_PUBLIC_CMS_GLOBALS_SOCIAL_SETTINGS_KEY ||
        "social_settings",
    },
  },
}
