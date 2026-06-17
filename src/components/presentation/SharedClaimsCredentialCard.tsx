import { IssuerAvatar } from '../issuance/IssuerAvatar'

type SharedClaimsCredentialCardProps = {
  credentialTitle: string
  verifierLabel: string
  description?: string
  logoUri?: string | null
}

export function SharedClaimsCredentialCard({
  credentialTitle,
  verifierLabel,
  description,
  logoUri = null,
}: SharedClaimsCredentialCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/50 bg-white text-left shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex flex-col gap-3 px-5 py-5">
        <IssuerAvatar displayName={credentialTitle} logoUri={logoUri} size="md" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight text-slate-900">
            {credentialTitle}
          </p>
          <p className="mt-0.5 truncate text-[14px] leading-relaxed text-slate-500">
            {verifierLabel}
          </p>
        </div>
        {description && (
          <p className="text-[13px] leading-relaxed text-slate-500">{description}</p>
        )}
      </div>
    </div>
  )
}
