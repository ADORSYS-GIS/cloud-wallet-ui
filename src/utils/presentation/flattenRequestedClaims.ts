import type { CredentialMatch, RequestedClaim } from '../../types/presentation'

export type RequestedClaimDisplay = {
  id: string
  label: string
  valuePreview?: string
}

function claimLabel(claim: RequestedClaim): string {
  if (claim.display_name) return claim.display_name
  return claim.path.filter((segment) => typeof segment === 'string').join(' ')
}

function claimValuePreview(claim: RequestedClaim): string | undefined {
  if (claim.value_preview) return claim.value_preview
  if (claim.value_required) return 'Required'
  return undefined
}

/**
 * Flatten credential_matches into Figma-style claim cards for Proof Details.
 * Uses the first candidate per match (auto-selection path until #87).
 */
export function flattenRequestedClaims(
  credentialMatches: CredentialMatch[]
): RequestedClaimDisplay[] {
  const claims: RequestedClaimDisplay[] = []

  for (const match of credentialMatches) {
    const candidate = match.candidates[0]
    if (!candidate) continue

    for (const [index, claim] of candidate.requested_claims.entries()) {
      claims.push({
        id: `${match.query_id}:${index}`,
        label: claimLabel(claim),
        valuePreview: claimValuePreview(claim),
      })
    }
  }

  return claims
}
