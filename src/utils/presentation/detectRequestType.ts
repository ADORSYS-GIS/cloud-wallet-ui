export type ScanRequestType = 'presentation' | 'issuance' | 'unknown'

/**
 * Heuristic classification of scanned QR content before full parsing.
 * OID4VP 1.0 cross-device QRs typically carry `client_id` + `request_uri` (JAR),
 * or inline `request` / `dcql_query` / `scope` parameters.
 * @see https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#section-5.7
 */
export function detectRequestType(qrContent: string): ScanRequestType {
  const content = qrContent.trim()

  if (
    content.includes('request_uri') ||
    content.includes('presentation_definition') ||
    content.includes('request=') ||
    content.includes('dcql_query') ||
    (content.includes('client_id') && content.includes('response_type'))
  ) {
    return 'presentation'
  }

  if (content.includes('credential_offer') || content.includes('credential_offer_uri')) {
    return 'issuance'
  }

  return 'unknown'
}
