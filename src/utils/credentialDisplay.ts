import type { CredentialSummary } from '../types/credential'

function lastSegment(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '')
  const parts = trimmed.split('/')
  const last = parts[parts.length - 1]
  return last || trimmed
}

export function credentialDisplayName(summary: CredentialSummary): string {
  if (summary.display_name?.trim()) {
    return summary.display_name.trim()
  }
  return lastSegment(summary.credential_type) || 'Credential'
}

export function issuerDisplayLabel(issuer: string): string {
  try {
    const host = new URL(issuer).host
    return host || issuer
  } catch {
    return issuer
  }
}
