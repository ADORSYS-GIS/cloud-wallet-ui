import type { CredentialRecord } from '../types/credential'
import type { CredentialDisplay, IssuerDisplayEntry } from '../types/issuance'

/**
 * Returns the last non-empty path segment of a string, stripping trailing slashes.
 * Used to derive a human-readable label from a URI-style identifier.
 *
 * Examples:
 *   'https://credentials.example.com/identity/mDL' → 'mDL'
 *   'eu.europa.ec.eudi.pid.1'                      → 'eu.europa.ec.eudi.pid.1'
 */
function lastSegment(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '')
  const parts = trimmed.split('/')
  const last = parts[parts.length - 1]
  return last || trimmed
}

/**
 * Derive a human-readable display name for a credential.
 *
 * The spec no longer includes a `display_name` field on `CredentialRecord`;
 * display metadata is carried on `CredentialTypeDisplay` (returned during
 * issuance). At the list/detail level we fall back to the last path segment
 * of `credential_configuration_id`.
 */
export function credentialDisplayName(credential: CredentialRecord): string {
  return lastSegment(credential.credential_configuration_id) || 'Credential'
}

/**
 * Return a short human-readable label for an issuer URI.
 * Extracts the `host` when the value is a valid URL; falls back to the raw string.
 */
export function issuerDisplayLabel(issuer: string): string {
  try {
    const host = new URL(issuer).host
    return host || issuer
  } catch {
    return issuer
  }
}

/**
 * Resolves issuer display metadata from the structured display array.
 *
 * Per OID4VCI spec, the display array contains locale-specific entries.
 * For v1, we use the first entry. When no display metadata is provided,
 * we fall back to the credential_issuer hostname.
 *
 * @param display - The issuer display array from StartIssuanceResponse.issuer
 * @param credentialIssuer - The credential_issuer URL for fallback (optional)
 * @returns Object with resolved name and logoUri (null if no logo available)
 */
export function resolveIssuerDisplay(
  display: IssuerDisplayEntry[],
  credentialIssuer?: string
): { name: string; logoUri: string | null; credentialIssuer: string } {
  // Determine the credential issuer URL to use for fallbacks
  // Per OpenAPI spec, when no display metadata is available, the backend
  // returns a single entry with `name` set to the credential_issuer URL
  const effectiveCredentialIssuer =
    credentialIssuer ?? display[0]?.name ?? 'Unknown Issuer'
  const fallbackName = issuerDisplayLabel(effectiveCredentialIssuer)

  // If display array is empty, use fallbacks
  if (display.length === 0) {
    return {
      name: fallbackName,
      logoUri: null,
      credentialIssuer: effectiveCredentialIssuer,
    }
  }

  const entry = display[0]

  // Use entry name if present, otherwise fall back to hostname
  const name = entry.name ?? fallbackName

  // Use logo URI if present, otherwise null
  const logoUri = entry.logo?.uri ?? null

  return { name, logoUri, credentialIssuer: effectiveCredentialIssuer }
}

/**
 * Resolves the first display entry from the credential display array.
 *
 * Per OID4VCI spec, the display array contains locale-specific entries.
 * For v1, we use the first entry.
 *
 * @param display - The credential display array from CredentialTypeDisplay.display
 * @returns The first CredentialDisplay entry
 */
export function resolveCredentialDisplay(
  display: CredentialDisplay[]
): CredentialDisplay {
  return display[0]!
}
