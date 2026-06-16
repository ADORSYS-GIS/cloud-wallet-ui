import type { BackgroundImage, Logo } from './credential'

/**
 * Lifecycle status for the OpenID4VP presentation flow.
 * @see https://openid.net/specs/openid-4-verifiable-presentations-1_0.html
 */
export type PresentationStatus =
  | 'idle'
  | 'loading'
  | 'parsing'
  | 'verifying'
  | 'selecting'
  | 'reviewing'
  | 'consenting'
  | 'submitting'
  | 'success'
  | 'rejected'
  | 'error'

export type PresentationFlow = 'cross_device' | 'same_device'

export type VerifierVerificationMethod =
  | 'pre-registered'
  | 'decentralized_identifier'
  | 'redirect_uri'
  | 'verifier_attestation'
  | 'x509_san_dns'
  | 'x509_san_uri'
  | 'x509_hash'
  | 'openid_federation'

/** Verifier display metadata from POST /presentation/start. */
export type VerifierDisplay = {
  name: string
  logo_uri?: string | null
  policy_uri?: string | null
  verified: boolean
  verification_method?: VerifierVerificationMethod | null
}

export type RequestedClaim = {
  path: (string | number | null)[]
  display_name?: string | null
  value_required?: boolean
}

/** Display metadata for a credential candidate (OpenAPI CredentialSummaryDisplay). */
export type CredentialSummaryDisplay = {
  name: string
  issuer_name: string
  credential_type: string
  description?: string
  background_color?: string
  background_image?: BackgroundImage
  text_color?: string
  logo?: Logo | null
}

export type CredentialCandidate = {
  credential_id: string
  display: CredentialSummaryDisplay
  requested_claims: RequestedClaim[]
}

export type CredentialMatch = {
  query_id: string
  required: boolean
  candidates: CredentialCandidate[]
}

export type TransactionDataDisplay = {
  type: string
  credential_ids: string[]
  display_data: Record<string, unknown>
}

/** Body for POST /presentation/start. */
export type StartPresentationRequest = {
  request: string
  origin?: string
}

/** Response from POST /presentation/start. */
export type StartPresentationResponse = {
  session_id: string
  expires_at: string
  flow: PresentationFlow
  verifier: VerifierDisplay
  purpose?: string | null
  credential_matches: CredentialMatch[]
  credential_set_options?: string[][] | null
  transaction_data?: TransactionDataDisplay[] | null
  requires_consent: boolean
}

/** Credential chosen by the holder for POST /presentation/{session_id}/consent. */
export type CredentialSelection = {
  query_id: string
  credential_id: string
}

export type SelectedCredential = CredentialSelection

/** Maps wallet credential ID → selected claim ids/paths for selective disclosure. */
export type DisclosedClaimMap = Record<string, string[]>

export type PresentationConsentStatus = 'completed' | 'rejected'

/** Outcome of POST /presentation/{session_id}/consent. */
export type PresentationConsentResponse = {
  status: PresentationConsentStatus
  redirect_uri: string | null
  verifier_response: Record<string, unknown> | null
}

/** Accept branch of POST /presentation/{session_id}/consent (OpenAPI oneOf). */
export type PresentationConsentAcceptRequest = {
  accepted: true
  selected_credentials: CredentialSelection[]
  transaction_data_acknowledged?: boolean
}

/** Reject branch of POST /presentation/{session_id}/consent (OpenAPI oneOf). */
export type PresentationConsentRejectRequest = {
  accepted: false
}

export type PresentationConsentRequest =
  | PresentationConsentAcceptRequest
  | PresentationConsentRejectRequest

export type PresentationResult = {
  success: boolean
  status?: PresentationConsentStatus
  redirect_uri?: string | null
  verifier_response?: Record<string, unknown> | null
  state?: string
}

/** OpenAPI-aligned error codes for presentation endpoints. */
export type PresentationErrorCode =
  | 'invalid_request'
  | 'invalid_presentation_request'
  | 'invalid_dcql_query'
  | 'invalid_client'
  | 'request_uri_fetch_failed'
  | 'request_object_invalid'
  | 'invalid_credential_selection'
  | 'transaction_data_not_acknowledged'
  | 'no_matching_credentials'
  | 'vp_formats_not_supported'
  | 'presentation_build_failed'
  | 'verifier_submission_failed'
  | 'session_not_found'
  | 'invalid_session_state'
  | 'verifier_metadata_fetch_failed'
  | 'user_rejected'
  | 'submission_failed'
  | 'unauthorized'
  | 'internal_error'
  | (string & Record<never, never>)

/**
 * Dedicated error screen variants for {@link PresentationErrorPage}.
 * Mapped from OpenAPI `error` codes and HTTP status per presentation contract.
 */
export type PresentationErrorVariant =
  | 'network'
  | 'expired'
  | 'rejected'
  | 'unsupported_credential'
  | 'invalid_request'
  | 'proof_generation'
  | 'generic'

export type PresentationError = {
  httpStatus?: number
  code: PresentationErrorCode
  message: string
  error_description?: string | null
}

/**
 * Parsed OID4VP authorization request parameters from a scanned QR code.
 * Used for client-side validation only — the backend receives the raw `request` string.
 */
export type PresentationAuthorizationRequest = {
  client_id: string
  request_uri?: string
  request_uri_method?: 'GET' | 'POST'
  request?: string
  response_type?: string
  nonce?: string
  state?: string
  response_mode?: string
  scope?: string
  dcql_query?: string
  client_metadata?: string
  client_metadata_uri?: string
}

/** Serializable presentation flow data persisted to localStorage. */
export type PersistedPresentationState = {
  status: PresentationStatus
  session_id?: string
  expires_at?: string
  flow?: PresentationFlow
  verifier?: VerifierDisplay
  purpose?: string | null
  credential_matches?: CredentialMatch[]
  credential_set_options?: string[][] | null
  transaction_data?: TransactionDataDisplay[] | null
  requires_consent?: boolean
  selected_credentials?: CredentialSelection[]
  disclosedClaims?: DisclosedClaimMap
  submissionResult?: PresentationResult
  error?: PresentationError
}
