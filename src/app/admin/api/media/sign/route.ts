import { getActiveServerMediaProvider } from "../../../seam"

/**
 * POST /api/media/sign
 *
 * Generic delegator: signs a client upload by handing the request to the
 * configured server media provider (registered by the shell). Core knows no
 * provider details.
 */
export async function POST(request: Request) {
  return getActiveServerMediaProvider().sign(request)
}
