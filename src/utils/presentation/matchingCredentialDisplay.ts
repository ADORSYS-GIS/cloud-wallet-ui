import type { CredentialListItemDisplay } from '../../types/credential'
import type { MatchingCredential } from '../../types/presentation'

export type ResolvedMatchingCredentialDisplay = {
  name: string
  issuerName: string
  logoUri: string | null
  description?: string
  backgroundColor?: string
  backgroundImage?: string
  textColor?: string
}

/** Resolve card display fields from backend matching-credential metadata. */
export function resolveMatchingCredentialDisplay(
  credential: MatchingCredential
): ResolvedMatchingCredentialDisplay {
  const display: CredentialListItemDisplay | undefined = credential.display

  return {
    name: display?.name ?? credential.displayName ?? credential.credentialId,
    issuerName: display?.issuer_name ?? 'Unknown Issuer',
    logoUri: display?.logo?.uri ?? null,
    description: display?.description,
    backgroundColor: display?.background_color,
    backgroundImage: display?.background_image?.uri,
    textColor: display?.text_color,
  }
}
