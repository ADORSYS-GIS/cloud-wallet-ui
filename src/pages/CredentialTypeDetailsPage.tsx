import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IssuerAvatar } from '../components/issuance/IssuerAvater'
import { PageContainer } from '../components/layout/PageContainer'
import { routes } from '../constants/routes'
import { useCredentialOfferState } from '../state/issuance.state'

type ClaimRow = {
  label: string
  value: string
}

function prettifyKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function toDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function buildClaimRows(selectedType: NonNullable<ReturnType<typeof useSelectedType>>) {
  const rows: ClaimRow[] = []

  // Future-proof rendering: if backend includes credential-specific claims in this
  // payload (non-spec extension), render them first in a generic way.
  const dynamicClaims = (selectedType as unknown as { claims?: Record<string, unknown> })
    .claims
  if (
    dynamicClaims &&
    typeof dynamicClaims === 'object' &&
    !Array.isArray(dynamicClaims)
  ) {
    Object.entries(dynamicClaims).forEach(([key, value]) => {
      rows.push({ label: prettifyKey(key), value: toDisplayValue(value) })
    })
  }

  rows.push(
    {
      label: 'Credential Configuration Id',
      value: selectedType.credential_configuration_id,
    },
    { label: 'Format', value: selectedType.format },
    { label: 'Name', value: selectedType.display.name }
  )

  if (selectedType.display.description) {
    rows.push({ label: 'Description', value: selectedType.display.description })
  }
  if (selectedType.display.background_color) {
    rows.push({
      label: 'Background Color',
      value: selectedType.display.background_color,
    })
  }
  if (selectedType.display.text_color) {
    rows.push({ label: 'Text Color', value: selectedType.display.text_color })
  }
  if (selectedType.display.logo?.uri) {
    rows.push({ label: 'Logo Uri', value: selectedType.display.logo.uri })
  }
  if (selectedType.display.logo?.alt_text) {
    rows.push({ label: 'Logo Alt Text', value: selectedType.display.logo.alt_text })
  }

  // Remove duplicates by label to keep list clean.
  return rows.filter(
    (row, index, self) =>
      self.findIndex((candidate) => candidate.label === row.label) === index
  )
}

function useSelectedType(
  session: ReturnType<typeof useCredentialOfferState>['offer'],
  optionId: string | undefined
) {
  return useMemo(() => {
    if (!session || !optionId) return null
    return (
      session.credential_types.find(
        (credentialType) => credentialType.credential_configuration_id === optionId
      ) ?? null
    )
  }, [optionId, session])
}

export function CredentialTypeDetailsPage() {
  const { optionId } = useParams<{ optionId: string }>()
  const navigate = useNavigate()
  const offerState = useCredentialOfferState()

  const session = offerState.offer
  const selectedType = useSelectedType(session, optionId)
  const issuerName = session?.issuer.display_name ?? 'Issuer'
  const issuerLogoUri = session?.issuer.logo_uri ?? null

  const shouldRedirect = !session || !selectedType || !optionId
  useEffect(() => {
    if (shouldRedirect) {
      navigate(routes.credentialTypes, { replace: true })
    }
  }, [navigate, shouldRedirect])
  if (shouldRedirect) return null

  const claimRows = buildClaimRows(selectedType)

  const handleIssueVc = () => {
    navigate(routes.issuanceSuccess)
  }

  return (
    <PageContainer fullWidth>
      <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#e7eaed] font-serif">
        <div className="grid grid-cols-[auto_1fr_auto] items-center border-b border-[#96a8b2] bg-gradient-to-r from-[#3f6f7e] to-[#4e7f8f] px-2 py-2">
          <button
            type="button"
            onClick={() => navigate(routes.credentialTypes)}
            className="h-10 w-10 rounded-full text-3xl leading-none text-white"
            aria-label="Back"
          >
            ‹
          </button>
          <div className="text-center text-[16px] md:text-[18px] font-semibold leading-none text-white">
            Credential Type Details
          </div>
          <div className="w-10" />
        </div>

        <section className="flex-1 overflow-y-auto px-1 py-1">
          <div className="rounded-md bg-[#e7eaed] p-1.5">
            <div className="mb-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
              <div className="flex flex-col items-start gap-1">
                <IssuerAvatar
                  displayName={issuerName}
                  logoUri={issuerLogoUri}
                  size="sm"
                />
              </div>
              <p className="mt-2 text-[14px] md:text-[15px] font-semibold leading-tight text-slate-900">
                {selectedType.display.name}
              </p>
              <p className="text-[12px] md:text-[13px] leading-tight text-slate-500">
                {issuerName}
              </p>
            </div>

            <p className="mb-2 text-[18px] md:text-[19px] font-semibold leading-tight text-slate-900">
              Here is the digital identity info:
            </p>
            <ul className="space-y-px">
              {claimRows.map((claim, index) => (
                <li
                  key={claim.label}
                  className={[
                    'flex min-h-7 items-center rounded-sm px-2 py-1 text-[13px] md:text-[14px] leading-tight text-slate-900',
                    index % 2 === 0 ? 'bg-[#efefef]' : 'bg-[#f8f8f8]',
                  ].join(' ')}
                >
                  <span className="font-medium text-slate-900">{claim.label}</span>
                  <span className="mx-1 text-slate-500">:</span>
                  <span className="truncate text-slate-900">{claim.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="px-2 pb-1">
          <button
            type="button"
            onClick={handleIssueVc}
            className="h-9 w-full rounded-[4px] bg-[#99e827] text-[14px] font-semibold text-slate-900 transition-colors duration-150 hover:bg-[#89d61f] active:bg-[#7dc31a]"
          >
            Issue VC
          </button>
          <button
            type="button"
            onClick={() => navigate(routes.credentialTypes)}
            className="mt-1 h-7 w-full rounded-[4px] bg-transparent text-[14px] text-slate-700 transition-colors duration-150 hover:bg-slate-100 active:bg-slate-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </PageContainer>
  )
}
