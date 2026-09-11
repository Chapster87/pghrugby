"use client"

/**
 * Host-owned forgecms seam registrar.
 *
 * Core ships an empty consumer registry and never imports host code. Importing
 * this client module from the root layout pulls plugin registrations into the
 * admin client bundle (side effects only; renders nothing). Do not place this
 * under `src/app/admin/` (the core mount) — that subtree is wholesale-overwritten on update.
 */
import "./standings"

export default function AdminRegistry() {
  return null
}
