import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { IssuerAvatar } from '../components/issuance/IssuerAvater'
import { PageContainer } from '../components/layout/PageContainer'
import { credentialTypeDetailsPath, routes } from '../constants/routes'
import { useCredentialOfferState } from '../state/issuance.state'
import type { CredentialTypeDisplay } from '../types/issuance'

type CredentialTypeCardProps = {
  credentialType: CredentialTypeDisplay
  issuerName: string
  issuerLogoUri: string | null
  onClick: (id: string) => void
}

function CredentialTypeCard({
  credentialType,
  issuerName,
  issuerLogoUri,
  onClick,
}: CredentialTypeCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(credentialType.credential_configuration_id)}
      className="flex w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex flex-col gap-1 px-3 py-3">
        <div className="flex flex-col items-start gap-1">
          <IssuerAvatar displayName={issuerName} logoUri={issuerLogoUri} size="sm" />
          <p className="truncate text-[14px] md:text-[15px] font-semibold leading-tight text-slate-900">
            {credentialType.display.name}
          </p>
          <p className="truncate text-[12px] md:text-[13px] leading-tight text-slate-500">
            {issuerName}
          </p>
        </div>
      </div>
    </button>
  )
}

export function CredentialTypesPage() {
  const navigate = useNavigate()
  const offerState = useCredentialOfferState()

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

  return (
    <PageContainer fullWidth>
      <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#e7eaed] font-serif">
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
          <div className="text-center text-[16px] md:text-[18px] font-semibold leading-none text-white">
            Credential Types
          </div>
          <div className="w-10" />
        </div>

        {/* Credential list — iterates directly over CredentialTypeDisplay */}
        <section className="flex-1 overflow-y-auto px-3 pt-1 pb-4">
          <ul className="space-y-3">
            {credential_types.map((ct) => (
              <li key={ct.credential_configuration_id}>
                <CredentialTypeCard
                  credentialType={ct}
                  issuerName={issuerName}
                  issuerLogoUri={issuer.logo_uri}
                  onClick={(id) => navigate(credentialTypeDetailsPath(id))}
                />
              </li>
            ))}
          </ul>
        </section>

        {/* Navigate to routes.scan directly — ?fresh=true is no longer read */}
        <Footer onScanClick={() => navigate(routes.scan)} scanDisabled={false} />
      </div>
    </PageContainer>
  )
}
