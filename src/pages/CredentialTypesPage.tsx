import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { IssuerAvatar } from '../components/issuance/IssuerAvater'
import { CredentialTypePill } from '../components/issuance/CredentialDetailTypePill'
import { PageContainer } from '../components/layout/PageContainer'
import { routes } from '../constants/routes'
import { useCredentialOfferState } from '../state/issuance.state'
import type { CredentialTypeDisplay } from '../types/issuance'

type CredentialTypeCardProps = {
  credentialType: CredentialTypeDisplay
  issuerName: string
  issuerLogoUri: string | null
  isSelected: boolean
  onSelect: (id: string) => void
}

function CredentialTypeCard({
  credentialType,
  issuerName,
  issuerLogoUri,
  isSelected,
  onSelect,
}: CredentialTypeCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(credentialType.credential_configuration_id)}
      aria-pressed={isSelected ? 'true' : 'false'}
      className={[
        'flex w-full flex-col gap-0 rounded-2xl border p-0 text-left transition-all duration-200 overflow-hidden shadow-sm',
        isSelected
          ? 'border-[#99e827] ring-2 ring-[#99e827] ring-offset-1 shadow-md'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-md',
      ].join(' ')}
    >
      <CredentialTypePill
        name={credentialType.display.name}
        backgroundColor={credentialType.display.background_color}
        textColor={credentialType.display.text_color}
        format={credentialType.format}
        description={credentialType.display.description}
      />

      {/* Issuer row */}
      <div className="flex items-center gap-3 bg-white px-5 py-3">
        <IssuerAvatar displayName={issuerName} logoUri={issuerLogoUri} size="sm" />
        <span className="min-w-0 truncate text-[13px] text-slate-500">{issuerName}</span>

        {isSelected && (
          <span className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#99e827] text-xs font-bold text-slate-900">
            ✓
          </span>
        )}
      </div>
    </button>
  )
}

export function CredentialTypesPage() {
  const navigate = useNavigate()
  const offerState = useCredentialOfferState()

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)

  // Guard: no offer → back to scan
  useEffect(() => {
    if (!offerState.offer) {
      navigate(routes.scan, { replace: true })
    }
  }, [navigate, offerState.offer])

  // Guard: empty credential_types → back to scan with error flag
  useEffect(() => {
    if (!offerState.offer) return
    if (offerState.offer.credential_types.length === 0) {
      navigate(`${routes.scan}?error=empty-options`, { replace: true })
    }
  }, [navigate, offerState.offer])

  if (!offerState.offer) return null

  const { issuer, credential_types } = offerState.offer

  const issuerName = issuer.display_name ?? new URL(issuer.credential_issuer).host

  // Validate that the stored selection still matches an available option
  const effectiveSelectedId =
    selectedOptionId &&
    credential_types.some((ct) => ct.credential_configuration_id === selectedOptionId)
      ? selectedOptionId
      : null

  const handleContinue = () => {
    // TODO: forward effectiveSelectedId to the consent endpoint once that
    // ticket lands. The selection is captured here; consent submission is
    // intentionally out of scope for this ticket.
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
          <IssuerAvatar displayName={issuerName} logoUri={issuer.logo_uri} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{issuerName}</p>
            <p className="truncate text-xs text-slate-500">{issuer.credential_issuer}</p>
          </div>
        </div>

        {/* Instruction */}
        <p className="px-4 pt-4 pb-2 text-sm text-slate-600">
          Select one credential to add to your wallet.
        </p>

        {/* Credential list — iterates directly over CredentialTypeDisplay */}
        <section className="flex-1 overflow-y-auto px-3 pt-1 pb-4">
          <ul className="space-y-3">
            {credential_types.map((ct) => (
              <li key={ct.credential_configuration_id}>
                <CredentialTypeCard
                  credentialType={ct}
                  issuerName={issuerName}
                  issuerLogoUri={issuer.logo_uri}
                  isSelected={ct.credential_configuration_id === effectiveSelectedId}
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
            disabled={!effectiveSelectedId}
            className="w-full rounded-xl bg-[#99e827] py-3 text-base font-semibold text-slate-900 shadow-sm transition-colors hover:bg-[#8cd422] active:bg-[#7fc01f] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
          </button>
        </div>

        {/* Navigate to routes.scan directly — ?fresh=true is no longer read */}
        <Footer onScanClick={() => navigate(routes.scan)} scanDisabled={false} />
      </div>
    </PageContainer>
  )
}
