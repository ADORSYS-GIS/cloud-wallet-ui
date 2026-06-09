import type {
  PresentationAuthorizationRequest,
  PresentationError,
} from '../../types/presentation'
import { detectRequestType } from './detectRequestType'
import { parsePresentationRequestParams } from './presentationRequest'

export type ParsedPresentationScanInput =
  | { ok: true; authorization: PresentationAuthorizationRequest }
  | { ok: false; error: PresentationError }

function extractPresentationSearchParams(input: string): URLSearchParams | null {
  const value = input.trim()
  if (!value) {
    return null
  }

  try {
    const url = new URL(value)
    if (
      url.protocol === 'openid4vp:' ||
      url.protocol === 'https:' ||
      url.protocol === 'http:'
    ) {
      return url.searchParams
    }
  } catch {
    // Not a URL — fall through to raw query-string parsing.
  }

  if (!value.includes('=')) {
    return null
  }

  try {
    const query = value.startsWith('?') ? value.slice(1) : value
    return new URLSearchParams(query)
  } catch {
    return null
  }
}

/**
 * Parse a scanned OpenID4VP QR code into authorization params for POST /presentation/start.
 * Returns null when the input is not recognizable as a presentation request.
 */
export function parsePresentationScanInput(
  input: string
): ParsedPresentationScanInput | null {
  if (detectRequestType(input) !== 'presentation') {
    return null
  }

  const searchParams = extractPresentationSearchParams(input)
  if (!searchParams) {
    return null
  }

  const result = parsePresentationRequestParams(searchParams)
  if (result.ok) {
    return { ok: true, authorization: result.authorization }
  }

  return { ok: false, error: result.error }
}
