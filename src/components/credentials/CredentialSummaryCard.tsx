import { useNavigate } from 'react-router-dom'
import { credentialDetailPath } from '../../constants/routes'
import { CredentialDisplayCard } from './CredentialDisplayCard'
import type { CredentialListItem } from '../../types/credential'

type CredentialSummaryCardProps = {
  credential: CredentialListItem
}

export function CredentialSummaryCard({ credential }: CredentialSummaryCardProps) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(credentialDetailPath(credential.id))}
      className="w-full text-left transition-all duration-200 hover:scale-[1.01] hover:shadow-md active:scale-[0.98]"
    >
      <CredentialDisplayCard
        display={credential.display}
        className="hover:bg-[#e6f4e6]"
      />
    </button>
  )
}
