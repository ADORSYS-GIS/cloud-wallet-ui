import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Header } from '../components/Header'
import { IssuerAvatar } from '../components/issuance/IssuerAvater'
import { PageContainer } from '../components/layout/PageContainer'
import { routes } from '../constants/routes'
import { useCredentialDetail } from '../hooks/useCredentialDetail'
import type { CredentialRecord } from '../types/credential'
import { credentialDisplayName, issuerDisplayLabel } from '../utils/credentialDisplay'

function claimValueString(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

function formatLabel(key: string): string {
  if (key === 'id') return 'Id'
  return key
    .split(/[_\s]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

type ClaimRowProps = {
  label: string
  value: string
  revealed: boolean
  onToggle: () => void
}

function ClaimRow({ label, value, revealed, onToggle }: ClaimRowProps) {
  const displayLabel = formatLabel(label)

  return (
    <div className="flex items-start justify-between py-4">
      <div className="min-w-0 flex-1 pr-4">
        <p className="text-[14px] font-normal leading-relaxed text-slate-500">
          {displayLabel}
        </p>
        <p
          className={[
            'mt-0.5 break-all text-[15px] text-slate-900 transition-all duration-200',
            revealed ? 'font-medium' : 'select-none tracking-[0.2em] text-slate-900',
          ].join(' ')}
          aria-label={revealed ? value : `${displayLabel} hidden`}
        >
          {revealed ? value : '•••••'}
        </p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 text-[14px] font-normal text-[#4b7c8c] underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[#4b7c8c]/50 rounded px-1 -mr-1"
        aria-label={revealed ? `Hide ${displayLabel}` : `Show ${displayLabel}`}
      >
        {revealed ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

type ClaimsSectionProps = {
  claims: Record<string, unknown>
}

function ClaimsSection({ claims }: ClaimsSectionProps) {
  const entries = Object.entries(claims)
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
  const allRevealed = entries.length > 0 && revealedKeys.size === entries.length

  if (entries.length === 0) {
    return (
      <div className="bg-white px-4 py-8 text-center text-sm text-slate-400">
        No details available for this credential.
      </div>
    )
  }

  const toggle = (key: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (allRevealed) {
      setRevealedKeys(new Set())
    } else {
      setRevealedKeys(new Set(entries.map(([k]) => k)))
    }
  }

  return (
    <div className="bg-white">
      <div className="flex justify-end px-4 pt-4">
        <button
          type="button"
          onClick={toggleAll}
          className="text-[14px] font-normal text-[#4b7c8c] underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[#4b7c8c]/50 rounded shadow-sm px-2 py-1"
          aria-label={allRevealed ? 'Hide all fields' : 'Show all fields'}
        >
          {allRevealed ? 'Hide All' : 'Show All'}
        </button>
      </div>

      <div className="px-4 pb-12">
        {entries.map(([key, value]) => (
          <ClaimRow
            key={key}
            label={key}
            value={claimValueString(value)}
            revealed={revealedKeys.has(key)}
            onToggle={() => toggle(key)}
          />
        ))}
      </div>
    </div>
  )
}

type CredentialHeaderCardProps = {
  credential: CredentialRecord
}

function CredentialHeaderCard({ credential }: CredentialHeaderCardProps) {
  const title = credentialDisplayName(credential)
  const issuer = issuerDisplayLabel(credential.issuer)
  const avatarDisplayName = issuer

  return (
    <div className="mx-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-200 hover:scale-[1.01] hover:shadow-md hover:border-[#4b7c8c]/30">
      <div className="flex items-center gap-4 px-5 py-5">
        <IssuerAvatar displayName={avatarDisplayName} logoUri={null} size="md" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight text-slate-900">
            {title}
          </p>
          <p className="mt-0.5 truncate text-[14px] leading-relaxed text-slate-500">
            {issuer}
          </p>
        </div>
      </div>
    </div>
  )
}

function CredentialDetailBody({ credentialId }: { credentialId: string }) {
  const navigate = useNavigate()
  const { credential, loading, error } = useCredentialDetail(credentialId)
  const headerTitle = 'Credential Details'

  return (
    <PageContainer fullWidth={true}>
      <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#E9ECEF]">
        <Header
          title={headerTitle}
          hidePwaBanner={true}
          leftSlot={
            <button
              type="button"
              onClick={() => navigate(routes.credentials)}
              className="flex items-center justify-start text-white transition-opacity hover:opacity-70 focus:outline-none"
              aria-label="Back to credentials"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          }
        />

        {loading && (
          <section className="flex flex-1 items-center justify-center bg-[#E9ECEF] text-slate-600">
            Loading…
          </section>
        )}

        {!loading && error && (
          <section className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#E9ECEF] px-4 text-center">
            <p className="text-slate-800">Could not open this credential.</p>
            <p className="text-sm text-slate-600">{error.message}</p>
            <button
              type="button"
              onClick={() => navigate(routes.credentials)}
              className="rounded-md bg-[#99e827] px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Back to credentials
            </button>
          </section>
        )}

        {!loading && !error && credential && (
          <CredentialDetailContent credential={credential} />
        )}
      </div>
    </PageContainer>
  )
}

function CredentialDetailContent({ credential }: { credential: CredentialRecord }) {
  return (
    <section className="flex-1 overflow-y-auto bg-white">
      <div className="bg-[#E9ECEF] py-4">
        <CredentialHeaderCard credential={credential} />
      </div>
      <ClaimsSection claims={credential.claims} />
    </section>
  )
}

export function CredentialDetailPage() {
  const { credentialId } = useParams<{ credentialId: string }>()
  if (!credentialId) {
    return <Navigate to={routes.credentials} replace />
  }
  return <CredentialDetailBody key={credentialId} credentialId={credentialId} />
}
