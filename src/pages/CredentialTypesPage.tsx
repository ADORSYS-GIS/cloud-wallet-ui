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
      className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-200 hover:scale-[1.01] hover:shadow-md hover:border-[#4b7c8c]/30 hover:bg-[#e6f4e6] active:scale-[0.98]"
    >
      <div className="flex items-center gap-4 px-5 py-12">
        <IssuerAvatar displayName={issuerName} logoUri={issuerLogoUri} size="md" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight text-slate-900">
            {credentialType.display.name}
          </p>
          <p className="mt-0.5 truncate text-[14px] leading-relaxed text-slate-500">
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

  useEffect(() => {
    if (!offerState.offer) {
      navigate(routes.scan, { replace: true })
    }
  }, [navigate, offerState.offer])

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
      <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#e9ecef] font-serif">
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

        <section className="flex-1 overflow-y-auto px-4 py-4">
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

        <Footer onScanClick={() => navigate(routes.scan)} scanDisabled={false} />
      </div>
    </PageContainer>
  )
}
