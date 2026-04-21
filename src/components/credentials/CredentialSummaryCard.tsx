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
      className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 text-left shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all hover:scale-[1.01] hover:shadow-md hover:border-[#4b7c8c]/30 active:scale-[0.98]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-slate-50">
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#4b7c8c" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-semibold tracking-tight text-slate-900">
          {title}
        </p>
        <p className="mt-0.5 truncate text-[14px] leading-relaxed text-slate-500">
          {issuer}
        </p>
      </div>
    </button>
  )
}
