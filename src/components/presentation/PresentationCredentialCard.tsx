import { IssuerAvatar } from '../issuance/IssuerAvatar'
import type { SelectableCredential } from '../../utils/presentation/matchingCredentialDisplay'
import { resolveMatchingCredentialDisplay } from '../../utils/presentation/matchingCredentialDisplay'

type PresentationCredentialCardProps = {
  credential: SelectableCredential
  onClick?: () => void
}

export function PresentationCredentialCard({
  credential,
  onClick,
}: PresentationCredentialCardProps) {
  const { name, issuerName, logoUri } = resolveMatchingCredentialDisplay(credential)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl bg-white px-4 py-4 text-left shadow-sm transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
    >
      <IssuerAvatar displayName={issuerName} logoUri={logoUri} size="md" />
      <div className="min-w-0">
        <p className="truncate text-base font-semibold leading-6 text-slate-900">
          {name}
        </p>
        <p className="truncate text-sm leading-[21px] text-slate-500">{issuerName}</p>
      </div>
    </button>
  )
}
