import type { Core } from "@strapi/strapi";

const config = ({
  env,
}: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env("HOST", "0.0.0.0"),
  port: env.int("PORT", 1337),
  url: env("URL"), // Ensure Strapi generates absolute URLs for assets based on this env variable
  app: {
    keys: env.array("APP_KEYS"),
  },
});

export default config;
