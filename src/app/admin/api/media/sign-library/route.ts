import { getActiveServerMediaProvider } from "../../../seam"

/**
 * POST /api/media/sign-library
 *
 * Generic delegator: signs the configured provider's media-library widget by
 * handing the request to the active server media provider.
 */
export async function POST(request: Request) {
  return getActiveServerMediaProvider().signLibrary(request)
}
