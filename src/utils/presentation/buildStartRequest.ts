import type {
  PresentationAuthorizationRequest,
  StartPresentationRequest,
} from '../../types/presentation'

/**
 * Serialize parsed authorization parameters into the OpenAPI `request` field.
 * The backend accepts a full `openid4vp://` URI with query parameters.
 */
export function buildStartPresentationRequest(
  authorization: PresentationAuthorizationRequest,
  origin?: string
): StartPresentationRequest {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(authorization)) {
    if (value !== undefined) {
      params.set(key, value)
    }
  }

  const body: StartPresentationRequest = {
    request: `openid4vp://?${params.toString()}`,
  }

  if (origin) {
    body.origin = origin
  }

  return body
}
