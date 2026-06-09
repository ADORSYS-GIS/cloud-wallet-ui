import {
  parsePresentationRequestParams,
  presentationRequestPath,
} from './presentationRequest'

/**
 * Parse a scanned OpenID4VP QR code (query-string payload) into an internal
 * `/present` route. Returns null when the input is not a recognizable
 * authorization request.
 */
export function parsePresentationScanInput(input: string): string | null {
  const value = input.trim()
  if (!value.includes('=')) {
    return null
  }

  const result = parsePresentationRequestParams(new URLSearchParams(value))
  return result.ok ? presentationRequestPath(result.authorization) : null
}
