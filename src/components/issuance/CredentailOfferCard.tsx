import type { StartIssuanceResponse } from '../../types/issuance'

type IssuerBadgeProps = {
  displayName: string | null
  credentialIssuer: string
  logoUri: string | null
}

function IssuerBadge({ displayName, credentialIssuer, logoUri }: IssuerBadgeProps) {
  const label = displayName ?? new URL(credentialIssuer).host
  return (
    <div className="flex items-center gap-3">
      {logoUri ? (
        <img
          src={logoUri}
          alt={`${label} logo`}
          className="h-9 w-9 rounded-full border border-slate-200 bg-white object-contain p-0.5"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
      ) : (
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4b7c8c] text-xs font-bold text-white"
          aria-hidden
        >
          {label.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
        <p className="truncate text-xs text-slate-500">{credentialIssuer}</p>
      </div>
    </div>
  )
}

type CredentialTypePillProps = {
  name: string
  backgroundColor?: string
  textColor?: string
  format: string
}

function CredentialTypePill({
  name,
  backgroundColor,
  textColor,
  format,
}: CredentialTypePillProps) {
  const bg = backgroundColor ?? '#4b7c8c'
  const fg = textColor ?? '#ffffff'

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg px-4 py-3"
      style={{ backgroundColor: bg, color: fg }}
    >
      <span className="text-sm font-semibold leading-snug">{name}</span>
      <span
        className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-medium opacity-70"
        style={{ backgroundColor: 'rgba(0,0,0,0.18)' }}
      >
        {format}
      </span>
    </div>
  )
}

type FlowBadgeProps = {
  flow: StartIssuanceResponse['flow']
  txCodeRequired: boolean
}

function FlowBadge({ flow, txCodeRequired }: FlowBadgeProps) {
  const label =
    flow === 'pre_authorized_code'
      ? txCodeRequired
        ? 'Pre-authorized · TX code required'
        : 'Pre-authorized'
      : 'Authorization Code'

  const color =
    flow === 'pre_authorized_code'
      ? txCodeRequired
        ? 'bg-amber-100 text-amber-800'
        : 'bg-emerald-100 text-emerald-800'
      : 'bg-blue-100 text-blue-800'

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
    >
      {label}
    </span>
  )
}

type CredentialOfferCardProps = {
  session: StartIssuanceResponse
  onAccept: () => void
  onDecline: () => void
}

export function CredentialOfferCard({
  session,
  onAccept,
  onDecline,
}: CredentialOfferCardProps) {
  const expiresAt = new Date(session.expires_at)
  const expiresLabel = expiresAt.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="absolute inset-x-3 top-3 z-20 flex flex-col gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-100 bg-[#f6f8fa] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Credential Offer
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          Session expires at {expiresLabel}
          {' · '}
          <span className="font-mono">{session.session_id.slice(0, 14)}…</span>
        </p>
      </div>

      <div className="border-b border-slate-100 px-4 py-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Issued by
        </p>
        <IssuerBadge
          displayName={session.issuer.display_name}
          credentialIssuer={session.issuer.credential_issuer}
          logoUri={session.issuer.logo_uri}
        />
      </div>

      <div className="border-b border-slate-100 px-4 py-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Credentials offered ({session.credential_types.length})
        </p>
        <div className="flex flex-col gap-2">
          {session.credential_types.map((ct) => (
            <div key={ct.credential_configuration_id}>
              <CredentialTypePill
                name={ct.display.name}
                backgroundColor={ct.display.background_color}
                textColor={ct.display.text_color}
                format={ct.format}
              />
              {ct.display.description && (
                <p className="mt-1 px-1 text-xs leading-snug text-slate-500">
                  {ct.display.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-b border-slate-100 px-4 py-3">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Authorization flow
        </p>
        <FlowBadge flow={session.flow} txCodeRequired={session.tx_code_required} />
        {session.tx_code_required && session.tx_code?.description && (
          <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-800">
            {session.tx_code.description}
          </p>
        )}
      </div>

      <div className="flex gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onDecline}
          className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="flex-1 rounded-lg bg-[#99e827] py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-[#8cd422] active:bg-[#7fc01f]"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
