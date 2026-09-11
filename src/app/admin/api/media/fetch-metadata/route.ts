import { getActiveServerMediaProvider } from "../../../seam"

/**
 * POST /api/media/fetch-metadata
 *
 * Generic delegator: fetches metadata for an existing asset by URL by handing
 * the request to the active server media provider.
 */
export async function POST(request: Request) {
  return getActiveServerMediaProvider().fetchMetadata(request)
}
