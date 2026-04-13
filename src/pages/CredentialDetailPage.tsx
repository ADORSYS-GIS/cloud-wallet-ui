import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { PageContainer } from '../components/layout/PageContainer'
import { routes } from '../constants/routes'
import { useCredentialDetail } from '../hooks/useCredentialDetail'
import type { CredentialRecord } from '../types/credential'
import { credentialDisplayName, issuerDisplayLabel } from '../utils/credentialDisplay'

// ---------------------------------------------------------------------------
// Claims renderer
// ---------------------------------------------------------------------------

/**
 * Render a single claim value as a readable string.
 * Objects and arrays are pretty-printed as JSON; primitives are coerced to string.
 */
function claimValueString(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

type ClaimsTableProps = {
  claims: Record<string, unknown>
}

function ClaimsTable({ claims }: ClaimsTableProps) {
  const entries = Object.entries(claims)

  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">No claims available.</p>
  }

  return (
    <dl className="grid gap-3">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {key}
          </dt>
          <dd className="mt-0.5 break-all font-mono text-sm text-slate-900 whitespace-pre-wrap">
            {claimValueString(value)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  expired: 'bg-slate-100 text-slate-600',
  revoked: 'bg-red-100 text-red-800',
  suspended: 'bg-yellow-100 text-yellow-800',
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {status}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Detail body
// ---------------------------------------------------------------------------

function CredentialDetailBody({ credentialId }: { credentialId: string }) {
  const navigate = useNavigate()
  const { credential, loading, error } = useCredentialDetail(credentialId)

  const headerTitle = credential ? credentialDisplayName(credential) : 'Credential'

  return (
    <PageContainer>
      <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#E9ECEF]">
        <Header
          title={headerTitle}
          leftSlot={
            <button
              type="button"
              onClick={() => navigate(routes.credentials)}
              className="rounded-full p-1 text-xl leading-none text-white"
              aria-label="Back to credentials"
            >
              ‹
            </button>
          }
        />

        {loading && (
          <section className="flex flex-1 items-center justify-center bg-[#F6F7F9] text-slate-600">
            Loading…
          </section>
        )}

        {!loading && error && (
          <section className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#F6F7F9] px-4 text-center">
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

        <Footer
          activeTab="creds"
          onScanClick={() => navigate(`${routes.scan}?fresh=true`)}
          scanDisabled={false}
        />
      </div>
    </PageContainer>
  )
}

// ---------------------------------------------------------------------------
// Content — separated so it only renders when credential is non-null
// ---------------------------------------------------------------------------

function CredentialDetailContent({ credential }: { credential: CredentialRecord }) {
  return (
    <section className="flex-1 overflow-y-auto bg-[#F6F7F9] p-4 space-y-4">
      {/* ----------------------------------------------------------------
          Core metadata card
      ---------------------------------------------------------------- */}
      <article className="mx-auto max-w-lg rounded-lg border border-[#D1D5DB] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Credential details
        </h2>
        <dl className="grid gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Configuration ID</dt>
            <dd className="break-all font-medium text-slate-900">
              {credential.credential_configuration_id}
            </dd>
          </div>

          <div>
            <dt className="text-slate-500">Format</dt>
            <dd className="font-medium text-slate-900">{credential.format}</dd>
          </div>

          <div>
            <dt className="text-slate-500">Issuer</dt>
            <dd className="text-slate-900">{issuerDisplayLabel(credential.issuer)}</dd>
            <dd className="mt-0.5 break-all text-xs text-slate-500">
              {credential.issuer}
            </dd>
          </div>

          <div>
            <dt className="text-slate-500">Status</dt>
            <dd>
              <StatusBadge status={credential.status} />
            </dd>
          </div>

          <div>
            <dt className="text-slate-500">Issued</dt>
            <dd className="text-slate-900">
              {new Date(credential.issued_at).toLocaleString()}
            </dd>
          </div>

          {credential.expires_at && (
            <div>
              <dt className="text-slate-500">Expires</dt>
              <dd className="text-slate-900">
                {new Date(credential.expires_at).toLocaleString()}
              </dd>
            </div>
          )}

          <div>
            <dt className="text-slate-500">Identifier</dt>
            <dd className="break-all font-mono text-xs text-slate-800">
              {credential.id}
            </dd>
          </div>
        </dl>
      </article>

      {/* ----------------------------------------------------------------
          Claims card
      ---------------------------------------------------------------- */}
      <article className="mx-auto max-w-lg rounded-lg border border-[#D1D5DB] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Claims
        </h2>
        <ClaimsTable claims={credential.claims} />
      </article>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page — guards the credentialId param
// ---------------------------------------------------------------------------

export function CredentialDetailPage() {
  const { credentialId } = useParams<{ credentialId: string }>()
  if (!credentialId) {
    return <Navigate to={routes.credentials} replace />
  }
  return <CredentialDetailBody key={credentialId} credentialId={credentialId} />
}
