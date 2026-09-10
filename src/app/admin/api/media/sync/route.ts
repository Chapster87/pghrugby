import { getActiveServerMediaProvider } from "../../../seam"

/**
 * POST /api/media/sync
 *
 * Generic delegator: reconciles the local registry with the configured provider
 * by handing the request to the active server media provider.
 */
export async function POST(request: Request) {
  return getActiveServerMediaProvider().sync(request)
}
