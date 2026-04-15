import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { PageContainer } from '../components/layout/PageContainer'
import { routes } from '../constants/routes'
import { useCredentialOfferState } from '../state/issuance.state'
import type { CredentialTypeDisplay } from '../types/issuance'

// ---------------------------------------------------------------------------
// Credential option row
// ---------------------------------------------------------------------------

type CredentialOptionRow = {
  id: string
  label: string
  format: string
  description?: string
  backgroundColor?: string
  textColor?: string
}

// ---------------------------------------------------------------------------
// CredentialTypeCard — a single selectable credential option
// ---------------------------------------------------------------------------

type CredentialTypeCardProps = {
  option: CredentialOptionRow
  issuerName: string
  issuerLogoUri: string | null
  isSelected: boolean
  onSelect: (id: string) => void
}

function CredentialTypeCard({
  option,
  issuerName,
  issuerLogoUri,
  isSelected,
  onSelect,
}: CredentialTypeCardProps) {
  const bg = option.backgroundColor ?? '#4b7c8c'
  const fg = option.textColor ?? '#ffffff'

  return (
    <button
      type="button"
      onClick={() => onSelect(option.id)}
      aria-pressed={isSelected}
      className={[
        'flex w-full flex-col gap-3 rounded-2xl border p-0 text-left transition-all duration-200 overflow-hidden shadow-sm',
        isSelected
          ? 'border-[#99e827] ring-2 ring-[#99e827] ring-offset-1 shadow-md'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-md',
      ].join(' ')}
    >
      {/* Coloured credential banner */}
      <div className={`w-full px-5 py-4 bg-[${bg}] text-[${fg}]`}>
        <div className="flex items-start justify-between gap-3">
          <span className="text-[17px] font-semibold leading-snug">{option.label}</span>
          <span className="mt-0.5 shrink-0 rounded px-2 py-0.5 font-mono text-[10px] font-medium opacity-75 bg-black/20">
            {option.format}
          </span>
        </div>
        {option.description && (
          <p className="mt-1.5 text-[13px] leading-snug opacity-80">
            {option.description}
          </p>
        )}
      </div>

      {/* Issuer row */}
      <div className="flex items-center gap-3 bg-white px-5 pb-4">
        {issuerLogoUri ? (
          <img
            src={issuerLogoUri}
            alt={issuerName ? `${issuerName} logo` : 'Issuer logo'}
            className="h-8 w-8 shrink-0 rounded-full object-contain ring-1 ring-slate-200"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 ring-1 ring-slate-200"
            aria-hidden
          >
            {issuerName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <span className="min-w-0 truncate text-[13px] text-slate-500">{issuerName}</span>

        {/* Selected checkmark */}
        {isSelected && (
          <span className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#99e827] text-xs font-bold text-slate-900">
            ✓
          </span>
        )}
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function CredentialTypesPage() {
  const navigate = useNavigate()
  const offerState = useCredentialOfferState()

  const options = useMemo<CredentialOptionRow[]>(() => {
    const offer = offerState.offer
    if (!offer) return []

    return offer.credential_types.map((t: CredentialTypeDisplay) => ({
      id: t.credential_configuration_id,
      label: t.display.name,
      format: t.format,
      description: t.display.description,
      backgroundColor: t.display.background_color,
      textColor: t.display.text_color,
    }))
  }, [offerState.offer])

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)

  // Keep selection valid if options change
  const effectiveSelectedOptionId =
    selectedOptionId && options.some((o) => o.id === selectedOptionId)
      ? selectedOptionId
      : null

  // Guard: no offer → back to scan
  useEffect(() => {
    if (!offerState.offer) {
      navigate(routes.scan, { replace: true })
    }
  }, [navigate, offerState.offer])

  // Guard: empty options → back to scan with error
  useEffect(() => {
    if (!offerState.offer) return
    if (options.length === 0) {
      navigate(`${routes.scan}?error=empty-options`, { replace: true })
    }
  }, [navigate, offerState.offer, options.length])

  if (!offerState.offer) return null

  const issuer = offerState.offer.issuer
  const issuerName = issuer.display_name ?? issuer.credential_issuer

  const handleContinue = () => {
    // Future: pass selectedOptionId into consent flow.
    // For now navigate forward as a placeholder — consent is a separate ticket.
    navigate(routes.credentials)
  }

  return (
    <PageContainer fullWidth>
      <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#E9ECEF]">
        {/* Sub-header */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center border-b border-[#96a8b2] bg-gradient-to-r from-[#3f6f7e] to-[#4e7f8f] px-2 py-2">
          <button
            type="button"
            onClick={() => navigate(routes.scan)}
            className="h-10 w-10 rounded-full text-3xl leading-none text-white"
            aria-label="Back"
          >
            ‹
          </button>
          <div className="text-center text-[22px] font-semibold leading-none text-white">
            Select Credential
          </div>
          <div className="w-10" />
        </div>

        {/* Issuer summary bar */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
          {issuer.logo_uri ? (
            <img
              src={issuer.logo_uri}
              alt={`${issuerName} logo`}
              className="h-9 w-9 shrink-0 rounded-full object-contain ring-1 ring-slate-200"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4b7c8c] text-xs font-bold text-white">
              {issuerName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{issuerName}</p>
            <p className="truncate text-xs text-slate-500">{issuer.credential_issuer}</p>
          </div>
        </div>

        {/* Instruction */}
        <p className="px-4 pt-4 pb-2 text-sm text-slate-600">
          Select one credential to add to your wallet.
        </p>

        {/* Credential list */}
        <section className="flex-1 overflow-y-auto px-3 pt-1 pb-4">
          <ul className="space-y-3">
            {options.map((option) => (
              <li key={option.id}>
                <CredentialTypeCard
                  option={option}
                  issuerName={issuerName}
                  issuerLogoUri={issuer.logo_uri}
                  isSelected={option.id === effectiveSelectedOptionId}
                  onSelect={setSelectedOptionId}
                />
              </li>
            ))}
          </ul>
        </section>

        {/* Continue button */}
        <div className="border-t border-slate-200 bg-white px-4 py-3">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!effectiveSelectedOptionId}
            className="w-full rounded-xl bg-[#99e827] py-3 text-base font-semibold text-slate-900 shadow-sm transition-colors hover:bg-[#8cd422] active:bg-[#7fc01f] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
          </button>
        </div>

        <Footer
          onScanClick={() => navigate(`${routes.scan}?fresh=true`)}
          scanDisabled={false}
        />
      </div>
    </PageContainer>
  )
}
