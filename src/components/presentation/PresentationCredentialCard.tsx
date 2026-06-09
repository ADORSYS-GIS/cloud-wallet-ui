import type { MatchingCredential } from '../../types/presentation'
import { resolveMatchingCredentialDisplay } from '../../utils/presentation/matchingCredentialDisplay'
import { IssuerAvatar } from '../issuance/IssuerAvater'

type PresentationCredentialCardProps = {
  credential: MatchingCredential
  onClick: () => void
}

export function PresentationCredentialCard({
  credential,
  onClick,
}: PresentationCredentialCardProps) {
  const { name, issuerName, logoUri, backgroundColor, backgroundImage, textColor } =
    resolveMatchingCredentialDisplay(credential)

  const hasCustomBackground = Boolean(backgroundColor || backgroundImage)
  const cardStyle: React.CSSProperties = backgroundImage
    ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: textColor,
      }
    : backgroundColor
      ? { backgroundColor, color: textColor }
      : {}

  const titleClass = textColor ? '' : 'text-slate-900'
  const subtitleClass = textColor ? '' : 'text-slate-500'

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full rounded-2xl px-4 py-4 text-left shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all duration-200 active:scale-[0.99]',
        hasCustomBackground ? 'hover:brightness-95' : 'bg-[#dfe3e7] hover:bg-[#d5dbe0]',
      ].join(' ')}
      style={cardStyle}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
          <IssuerAvatar displayName={issuerName} logoUri={logoUri} size="md" />
        </div>
        <div className="min-w-0">
          <p
            className={`truncate text-base font-semibold ${titleClass}`}
            style={textColor ? { color: textColor } : undefined}
          >
            {name}
          </p>
          <p
            className={`mt-0.5 truncate text-sm ${subtitleClass}`}
            style={textColor ? { color: textColor, opacity: 0.8 } : undefined}
          >
            {issuerName}
          </p>
        </div>
      </div>
    </button>
  )
}
