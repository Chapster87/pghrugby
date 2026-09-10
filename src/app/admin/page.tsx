import { redirect } from "next/navigation"
import { cmsPath } from "./lib/cms-path"

/**
 * Core home: `/admin` redirects to the first admin surface.
 */
export default function AdminHome() {
  redirect(cmsPath("/editor"))
}
