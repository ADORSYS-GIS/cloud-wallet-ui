import { useNavigate } from 'react-router-dom'
import { IssuerAvatar } from '../issuance/IssuerAvater'
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
      className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-200 hover:scale-[1.01] hover:shadow-md hover:border-[#4b7c8c]/30 hover:bg-[#e6f4e6] active:scale-[0.98]"
    >
      <div className="flex items-center gap-4 px-5 py-12">
        <IssuerAvatar displayName={issuer} logoUri={null} size="md" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight text-slate-900">
            {title}
          </p>
          <p className="mt-0.5 truncate text-[14px] leading-relaxed text-slate-500">
            {issuer}
          </p>
        </div>
      </div>
    </button>
  )
}
