import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { PageContainer } from '../components/layout/PageContainer'
import { routes } from '../constants/routes'
import { useCredentialOfferState } from '../state/issuance.state'
import type { CredentialTypeDisplay } from '../types/issuance'

type CredentialOptionRow = {
  id: string
  label: string
}

export function CredentialTypesPage() {
  const navigate = useNavigate()
  const offerState = useCredentialOfferState()
  const options = useMemo<CredentialOptionRow[]>(() => {
    const offer = offerState.offer
    if (!offer) {
      return []
    }

    return offer.credential_types.map((t: CredentialTypeDisplay) => ({
      id: t.credential_configuration_id,
      label: t.display.name,
    }))
  }, [offerState.offer])

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const effectiveSelectedOptionId =
    selectedOptionId &&
    options.some((option: CredentialOptionRow) => option.id === selectedOptionId)
      ? selectedOptionId
      : null

  useEffect(() => {
    if (!offerState.offer) {
      navigate(routes.scan, { replace: true })
    }
  }, [navigate, offerState.offer])

  useEffect(() => {
    if (!offerState.offer) {
      return
    }

    if (options.length === 0) {
      navigate(`${routes.scan}?error=empty-options`, { replace: true })
    }
  }, [navigate, offerState.offer, options.length])

  if (!offerState.offer) return null

  const issuerName =
    offerState.offer.issuer.display_name ?? offerState.offer.issuer.credential_issuer

  return (
    <PageContainer fullWidth>
      <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#E9ECEF]">
        <div className="grid grid-cols-[auto_1fr_auto] items-center border-b border-[#96a8b2] bg-gradient-to-r from-[#3f6f7e] to-[#4e7f8f] px-2 py-2">
          <button
            type="button"
            onClick={() => navigate(routes.scan)}
            className="h-10 w-10 rounded-full text-3xl leading-none text-white"
            aria-label="Back"
          >
            ‹
          </button>
          <div className="text-center text-[24px] font-semibold leading-none text-white">
            Credential Types
          </div>
          <div className="w-7" />
        </div>

        <section className="flex-1 px-2 pt-3">
          <ul className="space-y-2">
            {options.map((option: CredentialOptionRow) => {
              const isSelected = option.id === effectiveSelectedOptionId
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedOptionId(option.id)}
                    aria-pressed={isSelected}
                    className={[
                      'flex w-full flex-col items-start gap-2 rounded-2xl bg-white px-5 py-4 text-left font-semibold ring-1 transition-colors duration-300',
                      isSelected
                        ? 'bg-[#f4f8fa] text-slate-900 ring-slate-200 shadow-sm'
                        : 'ring-slate-200 hover:bg-[#e6f4e6]',
                    ].join(' ')}
                  >
                    {offerState.offer?.issuer.logo_uri ? (
                      <img
                        src={offerState.offer.issuer.logo_uri}
                        alt={issuerName ? `${issuerName} logo` : 'Issuer logo'}
                        className="h-14 w-14 shrink-0 rounded-full object-contain ring-1 ring-slate-200"
                      />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-full bg-slate-100 ring-1 ring-slate-200" />
                    )}
                    <div className="min-w-0 w-full">
                      <div className="truncate text-[19px] leading-tight text-slate-900">
                        {option.label}
                      </div>
                      <div className="truncate text-[16px] leading-tight text-slate-500">
                        {issuerName || 'Unknown issuer'}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <Footer
          onScanClick={() => navigate(`${routes.scan}?fresh=true`)}
          scanDisabled={false}
        />
      </div>
    </PageContainer>
  )
}
