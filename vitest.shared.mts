import { fileURLToPath } from "node:url"

/**
 * The `@/…` alias map shared by the pure and integration Vitest configs,
 * mirrored from `tsconfig.json`'s `paths`. The modules under test import through
 * these, so both runners must resolve the same map.
 */
const src = fileURLToPath(new URL("./src", import.meta.url))

export const resolveAlias = {
  "@": src,
  "@components": `${src}/components`,
  "@fragments": `${src}/fragments`,
  "@layouts": `${src}/layouts`,
  "@lib": `${src}/lib`,
  "@modules": `${src}/modules`,
  "@styles": `${src}/styles`,
  "@svg": `${src}/svg`,
  "@types": `${src}/types`,
}
