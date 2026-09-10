/**
 * Mount configuration for the embeddable CMS core.
 *
 * The core is installed (and served) under a single mount prefix. Every
 * core-internal route, link, and API call must derive from `cmsPath()` so the
 * whole core can be re-mounted by changing `CMS_MOUNT_PATH` alone.
 */
export const CMS_MOUNT_PATH = "/admin" as const

/** Prefix a core-relative path with the mount path. */
export function cmsPath(path = ""): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${CMS_MOUNT_PATH}${normalized}`
}
