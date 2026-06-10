import { issuerDisplayLabel } from '../credentialDisplay'
import type { VerifierMetadata } from '../../types/presentation'

const CLIENT_METADATA_NAME_KEYS = ['client_name', 'name', 'organization_name'] as const
const CLIENT_METADATA_PURPOSE_KEYS = [
  'purpose',
  'purpose_statement',
  'policy_uri',
  'description',
] as const
const CLIENT_METADATA_LOGO_KEYS = ['logo_uri', 'logo', 'logo_url'] as const

function readMetadataString(
  metadata: Record<string, unknown> | undefined,
  keys: readonly string[]
): string | undefined {
  if (!metadata) return undefined
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return undefined
}

const CLIENT_ID_PREFIXES = new Set([
  'redirect_uri',
  'openid_federation',
  'decentralized_identifier',
  'verifier_attestation',
  'x509_san_dns',
  'x509_hash',
  'origin',
])

function stripClientIdPrefix(clientId: string): string {
  const colonIndex = clientId.indexOf(':')
  if (colonIndex === -1) return clientId
  const prefix = clientId.slice(0, colonIndex)
  if (!CLIENT_ID_PREFIXES.has(prefix)) {
    return clientId
  }
  return clientId.slice(colonIndex + 1)
}

/**
 * Human-readable verifier label for consent UI.
 * Prefers resolved `name`, then client_metadata, then client_id host/path.
 */
export function verifierDisplayName(verifier: VerifierMetadata): string {
  if (verifier.name?.trim()) {
    return verifier.name.trim()
  }

  const metadataName = readMetadataString(
    verifier.client_metadata,
    CLIENT_METADATA_NAME_KEYS
  )
  if (metadataName) {
    return metadataName
  }

  const clientId = verifier.client_id.trim()
  try {
    return issuerDisplayLabel(stripClientIdPrefix(clientId))
  } catch {
    return clientId
  }
}

/** Logo URI from verifier metadata or client_metadata. */
export function verifierLogoUri(verifier: VerifierMetadata): string | null {
  if (verifier.logo_uri?.trim()) {
    return verifier.logo_uri.trim()
  }
  return readMetadataString(verifier.client_metadata, CLIENT_METADATA_LOGO_KEYS) ?? null
}

/** Optional purpose statement shown before the user shares data. */
export function verifierPurpose(verifier: VerifierMetadata): string | undefined {
  return readMetadataString(verifier.client_metadata, CLIENT_METADATA_PURPOSE_KEYS)
}
