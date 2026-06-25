import { CredentialDisplayCard } from '../credentials/CredentialDisplayCard'
import type { SelectableCredential } from '../../utils/presentation/matchingCredentialDisplay'

type PresentationCredentialCardProps = {
  credential: SelectableCredential
  onClick?: () => void
  selected?: boolean
}

export function PresentationCredentialCard({
  credential,
  onClick,
  selected,
}: PresentationCredentialCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'block w-full text-left transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]',
        selected ? 'ring-2 ring-[#99e827] rounded-2xl' : '',
      ].join(' ')}
      aria-pressed={selected}
    >
      <CredentialDisplayCard display={credential.display} />
    </button>
  )
}
