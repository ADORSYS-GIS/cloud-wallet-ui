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
 * Logo metadata for display objects.
 * Mirrors the OpenAPI `Logo` schema.
 */
export type Logo = {
  /** URI where the logo image can be obtained. */
  uri: string
  /** Alternative text for accessibility. */
  alt_text?: string
}

/**
 * Background image metadata for credential display.
 * Mirrors the OpenAPI `CredentialListItem.display.background_image` schema.
 */
export type BackgroundImage = {
  /** URI where the background image can be obtained. */
  uri: string
}

/**
 * Display metadata for a credential list item.
 * Mirrors the OpenAPI `CredentialListItem.display` schema.
 */
export type CredentialListItemDisplay = {
  /** Human-readable credential name. */
  name: string
  /** Human-readable description of the credential. */
  description?: string
  /** Background color for the credential card (CSS hex color). */
  background_color?: string
  /** Background image for the credential card. */
  background_image?: BackgroundImage
  /** Text color for the credential card (CSS hex color). */
  text_color?: string
  /** Logo image metadata. `null` if no logo is available. */
  logo?: Logo | null
  /** Human-readable display name of the issuer. Falls back to issuer URL if not available. */
  issuer_name?: string
  /** The credential configuration ID representing the credential type. */
  credential_type?: string
}

/**
 * Lightweight credential list item for UI rendering.
 * Mirrors the OpenAPI `CredentialListItem` schema.
 * Used by GET /credentials endpoint - optimized for list screens.
 * Full credential details (claims, format, status) available via GET /credentials/{id}.
 */
export type CredentialListItem = {
  /** Internal wallet credential ID (UUID v4). */
  id: string
  /** Display metadata for rendering the credential card in the UI. */
  display: CredentialListItemDisplay
  /** ISO 8601 timestamp when the credential was issued. */
  issued_at: string
}

/**
 * Display metadata for CredentialRecord (from GET /credentials/{id}).
 * Mirrors the display structure in CredentialListItem but is optional
 * since the backend may not always include it in the detail response.
 */
export type CredentialRecordDisplay = {
  /** Human-readable credential name. */
  name?: string
  /** Human-readable description of the credential. */
  description?: string
  /** Background color for the credential card (CSS hex color). */
  background_color?: string
  /** Background image for the credential card. */
  background_image?: BackgroundImage
  /** Text color for the credential card (CSS hex color). */
  text_color?: string
  /** Logo image metadata. `null` if no logo is available. */
  logo?: Logo | null
  /** Human-readable display name of the issuer. */
  issuer_name?: string
  /** The credential configuration ID representing the credential type. */
  credential_type?: string
}

/**
 * Mirrors the OpenAPI `CredentialRecord` schema.
 *
 * Field mapping (old → new):
 *   credential_type  → credential_configuration_id
 *   display_name     → removed (display metadata lives in issuance types)
 *   issued_at        → required (was optional)
 *   claims           → added (required)
 *   format           → added (required)
 *   display          → added (optional, for UI rendering)
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
   * `undefined` when the field is omitted from the response.
   */
  expires_at: string | null | undefined
  /**
   * Decoded credential claims.
   * Structure is credential-type specific; additional properties permitted.
   */
  claims: Record<string, unknown>
  /**
   * Display metadata for UI rendering of the credential card.
   * Optional - may not be present in all backend responses.
   */
  display?: CredentialRecordDisplay
}

/**
 * Mirrors the OpenAPI `CredentialListResponse` schema.
 * The top-level field is `credentials`, not `items`.
 * Note: GET /credentials now returns CredentialListItem[] (lightweight display metadata),
 * not full CredentialRecord objects. Use GET /credentials/{id} for full details.
 */
export type CredentialListResponse = {
  credentials: CredentialListItem[]
}
