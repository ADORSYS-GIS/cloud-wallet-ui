import type { PresentationError } from '../../types/presentation'
import { detectRequestType } from './detectRequestType'
import { parsePresentationRequestParams } from './presentationRequest'

export type ParsedPresentationScanInput =
  | { ok: true; request: string }
  | { ok: false; error: PresentationError }

/**
 * Validate a scanned OpenID4VP QR code and return the raw request string for
 * POST /presentation/start. Returns null when the input is not recognizable
 * as a presentation request.
 */
export function parsePresentationScanInput(
  input: string
): ParsedPresentationScanInput | null {
  const request = input.trim()
  if (!request) {
    return null
  }

  if (detectRequestType(request) !== 'presentation') {
    return null
  }

  let searchParams: URLSearchParams | null = null
  try {
    const url = new URL(request)
    if (
      url.protocol === 'openid4vp:' ||
      url.protocol === 'https:' ||
      url.protocol === 'http:'
    ) {
      searchParams = url.searchParams
    }
  } catch {
    if (request.includes('=')) {
      try {
        const query = request.startsWith('?') ? request.slice(1) : request
        searchParams = new URLSearchParams(query)
      } catch {
        return null
      }
    }
  }

  if (!searchParams) {
    return null
  }

  const result = parsePresentationRequestParams(searchParams)
  if (result.ok) {
    return { ok: true, request }
  }

  return { ok: false, error: result.error }
}
