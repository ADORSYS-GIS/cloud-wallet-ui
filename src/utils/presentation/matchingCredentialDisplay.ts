import type { CredentialCandidate, CredentialMatch } from '../../types/presentation'

export type ResolvedMatchingCredentialDisplay = {
  name: string
  issuerName: string
  logoUri: string | null
  description?: string
  backgroundColor?: string
  backgroundImage?: string
  textColor?: string
}

export type SelectableCredential = CredentialCandidate & {
  query_id: string
  required: boolean
}

/** Flatten credential_matches into UI-selectable rows. */
export function flattenCredentialMatches(
  matches: CredentialMatch[]
): SelectableCredential[] {
  return matches.flatMap((match) =>
    match.candidates.map((candidate) => ({
      ...candidate,
      query_id: match.query_id,
      required: match.required,
    }))
  )
}

/** Resolve card display fields from a credential candidate. */
export function resolveMatchingCredentialDisplay(
  credential: Pick<CredentialCandidate, 'credential_id' | 'display'>
): ResolvedMatchingCredentialDisplay {
  const { display } = credential

  return {
    name: display.name,
    issuerName: display.issuer_name,
    logoUri: display.logo?.uri ?? null,
    description: display.description,
    backgroundColor: display.background_color,
    backgroundImage: display.background_image?.uri,
    textColor: display.text_color,
  }
}
