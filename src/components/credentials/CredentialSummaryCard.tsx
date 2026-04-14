import { useNavigate } from 'react-router-dom'
import { credentialDetailPath } from '../../constants/routes'
import type { CredentialRecord } from '../../types/credential'
import { credentialDisplayName, issuerDisplayLabel } from '../../utils/credentialDisplay'

type CredentialSummaryCardProps = {
  credential: CredentialRecord
}

export function CredentialSummaryCard({ credential }: CredentialSummaryCardProps) {
  const navigate = useNavigate()
  const title = credentialDisplayName(credential)
  const issuer = issuerDisplayLabel(credential.issuer)

  return (
    <button
      type="button"
      onClick={() => navigate(credentialDetailPath(credential.id))}
      className="w-full rounded-lg border border-[#D1D5DB] bg-white p-6 text-left shadow-[0px_1px_24px_0px_rgba(44,51,53,0.09)] transition-colors hover:bg-[#e6f4e6]"
    >
      <p className="text-base font-semibold leading-6 text-slate-900">{title}</p>
      <p className="mt-1 text-sm leading-5 text-slate-600">{issuer}</p>
    </button>
  )
}
