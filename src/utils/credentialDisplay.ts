import type { CredentialRecord } from '../types/credential'

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
