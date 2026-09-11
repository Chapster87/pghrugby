import { cmsPath } from "./cms-path"

/**
 * True when the pathname is the auth page or a nested auth route.
 * Used to render a locked-down shell without admin chrome.
 */
export function isAuthPath(pathname: string): boolean {
  const authRoot = cmsPath("/auth")
  return pathname === authRoot || pathname.startsWith(`${authRoot}/`)
}
