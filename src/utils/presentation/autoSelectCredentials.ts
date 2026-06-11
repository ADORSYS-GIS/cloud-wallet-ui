import type { CredentialMatch, CredentialSelection } from '../../types/presentation'

/**
 * Auto-select wallet credentials when each required match has a single candidate.
 * Falls back to the first candidate when multiple exist (until #87 selection UI).
 */
export function autoSelectCredentials(
  credentialMatches: CredentialMatch[]
): CredentialSelection[] {
  const selections: CredentialSelection[] = []

  for (const match of credentialMatches) {
    if (match.candidates.length === 0) {
      continue
    }

    const candidate = match.candidates[0]
    selections.push({
      query_id: match.query_id,
      credential_id: candidate.credential_id,
    })
  }

  return selections
}
