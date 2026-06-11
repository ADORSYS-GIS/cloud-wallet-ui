import type { CredentialListItemDisplay } from './credential'

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

/** Verifier display block from POST /presentation/start (OpenAPI VerifierDisplay). */
export type VerifierDisplay = {
  name: string
  logo_uri?: string | null
  policy_uri?: string | null
  verified: boolean
  verification_method?: VerifierVerificationMethod | null
}

export type ClaimsPathPointer = (string | number | null)[]

/** Requested claim from credential_matches[].candidates[].requested_claims. */
export type RequestedClaim = {
  path: ClaimsPathPointer
  display_name?: string | null
  value_required?: boolean
}

export type CredentialSummaryDisplay = CredentialListItemDisplay

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

export type CredentialSelection = {
  query_id: string
  credential_id: string
}

/** Body for POST /presentation/start (OpenAPI StartPresentationRequest). */
export type StartPresentationRequest = {
  request: string
  origin?: string
}

/** Response from POST /presentation/start (OpenAPI StartPresentationResponse). */
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

/** Body for POST /presentation/{session_id}/consent. */
export type PresentationConsentRequest = {
  accepted: boolean
  selected_credentials?: CredentialSelection[]
  transaction_data_acknowledged?: boolean
}

export type PresentationConsentStatus = 'completed' | 'rejected'

export type PresentationConsentResponse = {
  status: PresentationConsentStatus
  redirect_uri: string | null
  verifier_response: { redirect_uri?: string } | null
}

export type PresentationErrorCode =
  | 'invalid_request'
  | 'invalid_presentation_request'
  | 'invalid_dcql_query'
  | 'no_matching_credentials'
  | 'invalid_client'
  | 'session_not_found'
  | 'invalid_session_state'
  | 'invalid_credential_selection'
  | 'transaction_data_not_acknowledged'
  | 'presentation_build_failed'
  | 'verifier_submission_failed'
  | 'request_uri_fetch_failed'
  | 'request_object_invalid'
  | 'user_rejected'
  | 'submission_failed'
  | 'unauthorized'
  | 'internal_error'
  | (string & Record<never, never>)

export type PresentationError = {
  httpStatus?: number
  code: PresentationErrorCode
  message: string
  error_description?: string | null
}

/**
 * Parsed OpenID4VP authorization parameters from a scanned QR or deep link.
 * Serialized into `StartPresentationRequest.request` before calling the backend.
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
  sessionId?: string
  expiresAt?: string
  flow?: PresentationFlow
  purpose?: string | null
  verifier?: VerifierDisplay
  /** client_id from the scanned authorization request (for unverified verifier display). */
  authorizationClientId?: string
  credentialMatches?: CredentialMatch[]
  credentialSetOptions?: string[][] | null
  transactionData?: TransactionDataDisplay[] | null
  selectedCredentials?: CredentialSelection[]
  consentResponse?: PresentationConsentResponse
  error?: PresentationError
}
