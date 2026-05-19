import { IssuerAvatar } from '../issuance/IssuerAvater'

type CredentialDisplay = {
  name?: string
  issuer_name?: string
  background_color?: string
  background_image?: { uri?: string } | null
  text_color?: string
  logo?: { uri?: string } | null
}

type CredentialDisplayCardProps = {
  display: CredentialDisplay
  fallbackTitle?: string
  fallbackIssuer?: string
  className?: string
}

export function CredentialDisplayCard({
  display,
  fallbackTitle = 'Credential',
  fallbackIssuer = 'Unknown Issuer',
  className = '',
}: CredentialDisplayCardProps) {
  const title = display.name ?? fallbackTitle
  const issuer = display.issuer_name ?? fallbackIssuer
  const logoUri = display.logo?.uri ?? null

  // Use display metadata from API if available
  const backgroundColor = display.background_color
  const textColor = display.text_color
  const backgroundImage = display.background_image?.uri

  // Build dynamic styles from display metadata
  // Background image takes precedence over background color
  const cardStyle: React.CSSProperties = {
    ...(backgroundImage
      ? {
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : { backgroundColor: backgroundColor }),
    color: textColor,
  }

  // Determine text color classes
  const textColorClass = textColor ? '' : 'text-slate-900'
  const subTextColorClass = textColor ? '' : 'text-slate-500'

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200/50 shadow-[0_2px_12px_rgba(0,0,0,0.06)] ${!backgroundColor && !backgroundImage ? 'bg-white' : ''} ${className}`}
      style={cardStyle}
    >
      <div className="flex items-center gap-4 px-5 py-12">
        <IssuerAvatar displayName={issuer} logoUri={logoUri} size="md" />
        <div className="min-w-0">
          <p
            className={`truncate text-base font-semibold tracking-tight ${textColorClass}`}
            style={textColor ? { color: textColor } : undefined}
          >
            {title}
          </p>
          <p
            className={`mt-0.5 truncate text-[14px] leading-relaxed ${subTextColorClass}`}
            style={textColor ? { color: textColor, opacity: 0.8 } : undefined}
          >
            {issuer}
          </p>
        </div>
      </div>
    </div>
  )
}
