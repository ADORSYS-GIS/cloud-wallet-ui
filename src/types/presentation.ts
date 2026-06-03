import type { CredentialFormat } from './credential'

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

/** Verifier-facing metadata resolved from client_id and client_metadata. */
export type VerifierMetadata = {
  client_id: string
  client_metadata?: Record<string, unknown>
  name?: string
  logo_uri?: string
}

/** Claims path pointer per OID4VP §7 (JSON-based credentials). */
export type ClaimsPathPointer = (string | number | null)[]

export type DcqlClaimQuery = {
  id?: string
  path: ClaimsPathPointer
  values?: unknown[]
}

export type DcqlCredentialQuery = {
  id: string
  format: string
  meta?: Record<string, unknown>
  claims?: DcqlClaimQuery[]
  claim_sets?: string[][]
  trusted_authorities?: unknown[]
  require_cryptographic_holder_binding?: boolean
}

export type DcqlCredentialSetQuery = {
  options: string[][]
  required?: boolean
}

/** DCQL query from the dcql_query authorization request parameter. */
export type DcqlQuery = {
  credentials: DcqlCredentialQuery[]
  credential_sets?: DcqlCredentialSetQuery[]
}

/**
 * Normalized presentation authorization request after parsing
 * (authorization request or signed request object).
 */
export type ParsedPresentationRequest = {
  response_type?: string
  response_mode?: string
  client_id?: string
  scope?: string
  dcql_query?: DcqlQuery
  state?: string
  nonce?: string
  request_uri?: string
  request_uri_method?: string
  presentation_definition?: Record<string, unknown>
  presentation_definition_uri?: string
  [key: string]: unknown
}

/** Wallet credential that satisfies a DCQL credential query. */
export type MatchingCredential = {
  credentialId: string
  queryId: string
  format: CredentialFormat | string
  displayName?: string
}

/** Credential chosen by the holder for presentation. */
export type SelectedCredential = {
  credentialId: string
  queryId: string
  format: CredentialFormat | string
}

/** Maps wallet credential ID → selected claim ids/paths for selective disclosure. */
export type DisclosedClaimMap = Record<string, string[]>

export type PresentationResult = {
  success: boolean
  redirect_uri?: string
  state?: string
}

export type PresentationErrorCode =
  | 'invalid_request'
  | 'invalid_presentation_request'
  | 'session_not_found'
  | 'invalid_session_state'
  | 'verifier_metadata_fetch_failed'
  | 'no_matching_credentials'
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

/** Serializable presentation flow data persisted to localStorage. */
export type PersistedPresentationState = {
  status: PresentationStatus
  request?: ParsedPresentationRequest
  verifier?: VerifierMetadata
  matchingCredentials?: MatchingCredential[]
  selectedCredentials?: SelectedCredential[]
  disclosedClaims?: DisclosedClaimMap
  submissionResult?: PresentationResult
  error?: PresentationError
}
