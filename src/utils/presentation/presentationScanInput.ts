import {
  parsePresentationRequestParams,
  presentationRequestPath,
} from './presentationRequest'

const PRESENTATION_URL_PROTOCOLS = new Set(['https:', 'openid4vp:'])

/**
 * Parse a scanned OpenID4VP QR code into an internal `/present` route.
 * Returns null when the input is not a recognizable authorization request.
 */
export function parsePresentationScanInput(input: string): string | null {
  const value = input.trim()
  if (!value) {
    return null
  }

  const fromSearchParams = (searchParams: URLSearchParams): string | null => {
    const result = parsePresentationRequestParams(searchParams)
    return result.ok ? presentationRequestPath(result.authorization) : null
  }

  try {
    const url = new URL(value)
    if (PRESENTATION_URL_PROTOCOLS.has(url.protocol)) {
      return fromSearchParams(url.searchParams)
    }
  } catch {
    // Fall through to raw query-string parsing.
  }

  if (value.includes('=')) {
    return fromSearchParams(new URLSearchParams(value))
  }

  return null
}
