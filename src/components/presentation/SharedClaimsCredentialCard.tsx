import { IssuerAvatar } from '../issuance/IssuerAvater'

type SharedClaimsCredentialCardProps = {
  credentialTitle: string
  verifierLabel: string
  description?: string
  logoUri?: string | null
}

/** Matches activity list card dimensions and hover treatment. */
const cardClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-colors duration-200 hover:bg-[#e6f4e6]'

export function SharedClaimsCredentialCard({
  credentialTitle,
  verifierLabel,
  description,
  logoUri = null,
}: SharedClaimsCredentialCardProps) {
  return (
    <div className={cardClass}>
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <IssuerAvatar displayName={credentialTitle} logoUri={logoUri} size="md" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-snug text-slate-900">
            {credentialTitle}
          </p>
          <p className="mt-1 text-[14px] leading-relaxed text-slate-600">
            {verifierLabel}
          </p>
          {description && (
            <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
