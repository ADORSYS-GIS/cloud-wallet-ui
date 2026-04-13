// ---------------------------------------------------------------------------
// Types derived directly from the OpenAPI spec schemas for the issuance flow.
// ---------------------------------------------------------------------------

export type IssuerSummary = {
  credential_issuer: string
  display_name: string | null
  logo_uri: string | null
}

export type CredentialLogo = {
  uri: string
  alt_text?: string
}

export type CredentialDisplay = {
  name: string
  description?: string
  background_color?: string
  text_color?: string
  logo?: CredentialLogo | null
}

export type CredentialTypeDisplay = {
  credential_configuration_id: string
  format: string
  display: CredentialDisplay
}

export type TxCodeSpec = {
  input_mode: 'numeric' | 'text'
  length: number | null
  description: string | null
}

export type IssuanceFlow = 'authorization_code' | 'pre_authorized_code'

export type StartIssuanceResponse = {
  session_id: string
  expires_at: string
  issuer: IssuerSummary
  credential_types: CredentialTypeDisplay[]
  flow: IssuanceFlow
  tx_code_required: boolean
  tx_code: TxCodeSpec | null
}

// ---------------------------------------------------------------------------
// API error shape — mirrors the OpenAPI ErrorResponse schema.
// ---------------------------------------------------------------------------

/**
 * Known machine-readable error codes from the spec.
 * The union is left open with `string` so unknown future codes don't break.
 */
export type IssuanceErrorCode =
  | 'invalid_credential_offer'
  | 'session_not_found'
  | 'invalid_session_state'
  | 'invalid_tx_code'
  | 'issuer_metadata_fetch_failed'
  | 'auth_server_metadata_fetch_failed'
  | 'invalid_request'
  | 'unauthorized'
  | 'internal_error'
  | (string & Record<never, never>)

export type IssuanceApiError = {
  /** HTTP status code */
  httpStatus: number
  /** Machine-readable error code from the response body (if available). */
  error: IssuanceErrorCode
  /** Human-readable description from the response body (if available). */
  error_description: string | null
}
