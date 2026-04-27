/**
 * Spec enum: active | expired | revoked | suspended
 * We keep the union open-ended with `string` so unknown future values don't
 * break at runtime, while still providing IDE autocompletion for the known ones.
 */
export type CredentialStatus =
  | 'active'
  | 'expired'
  | 'revoked'
  | 'suspended'
  | (string & Record<never, never>)

/**
 * Credential format as defined in the spec enum.
 */
export type CredentialFormat =
  | 'dc+sd-jwt'
  | 'mso_mdoc'
  | 'jwt_vc_json'
  | 'jwt_vc_json-ld'
  | 'ldp_vc'

/**
 * Mirrors the OpenAPI `CredentialRecord` schema.
 *
 * Field mapping (old → new):
 *   credential_type  → credential_configuration_id
 *   display_name     → removed (display metadata lives in issuance types)
 *   issued_at        → required (was optional)
 *   claims           → added (required)
 *   format           → added (required)
 */
export type CredentialRecord = {
  /** Internal wallet credential ID (UUID v4). */
  id: string
  /** Credential configuration identifier from the issuer's metadata. */
  credential_configuration_id: string
  /** Credential format. */
  format: CredentialFormat
  /** Issuer identifier URI. */
  issuer: string
  /** Current validity status. */
  status: CredentialStatus
  /** ISO 8601 timestamp when the credential was issued. Required per spec. */
  issued_at: string
  /**
   * ISO 8601 expiry timestamp.
   * `null` when the credential has no expiry.
   */
  expires_at: string | null
  /**
   * Decoded credential claims.
   * Structure is credential-type specific; additional properties permitted.
   */
  claims: Record<string, unknown>
}

/**
 * Mirrors the OpenAPI `CredentialListResponse` schema.
 * The top-level field is `credentials`, not `items`.
 */
export type CredentialListResponse = {
  credentials: CredentialRecord[]
}
