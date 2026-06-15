import { CredentialDisplayCard } from '../credentials/CredentialDisplayCard'
import type { SelectableCredential } from '../../utils/presentation/matchingCredentialDisplay'

type PresentationCredentialCardProps = {
  credential: SelectableCredential
  onClick?: () => void
}

export function PresentationCredentialCard({
  credential,
  onClick,
}: PresentationCredentialCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
    >
      <CredentialDisplayCard display={credential.display} />
    </button>
  )
}
