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
      className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-5 text-left shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all hover:scale-[1.01] hover:shadow-md hover:border-[#499c9d]/30 active:scale-[0.98]"
    >
      <p className="truncate text-base font-semibold tracking-tight text-slate-900">{title}</p>
      <p className="mt-1 truncate text-[14px] leading-relaxed text-slate-500">{issuer}</p>
    </button>
  )
}
