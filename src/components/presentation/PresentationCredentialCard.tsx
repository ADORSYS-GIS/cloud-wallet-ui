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
<<<<<<< HEAD
  const { name, issuerName, logoUri } = resolveMatchingCredentialDisplay(credential)

  const baseClasses =
    'flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left transition-transform duration-200'
  const stateClasses = selected
    ? 'bg-[#99e827]/20 ring-2 ring-[#99e827]'
    : 'bg-white shadow-sm hover:scale-[1.01] active:scale-[0.99]'

  return (
    <button type="button" onClick={onClick} className={`${baseClasses} ${stateClasses}`}>
      <IssuerAvatar displayName={issuerName} logoUri={logoUri} size="md" />
      <div className="min-w-0">
        <p className="truncate text-base font-semibold leading-6 text-slate-900">
          {name}
        </p>
        <p className="truncate text-sm leading-[21px] text-slate-500">{issuerName}</p>
      </div>
=======
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
    >
      <CredentialDisplayCard display={credential.display} />
>>>>>>> 6f6d0afbda5f1b7a66a3ca38a15f0218864fa6e5
    </button>
  )
}
