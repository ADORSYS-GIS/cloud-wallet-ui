import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { PageContainer } from '../components/layout/PageContainer'
import { routes } from '../constants/routes'
import { useCredentialDetail } from '../hooks/useCredentialDetail'
import { credentialDisplayName, issuerDisplayLabel } from '../utils/credentialDisplay'

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
          <section className="flex-1 overflow-y-auto bg-[#F6F7F9] p-4">
            <article className="mx-auto max-w-lg rounded-lg border border-[#D1D5DB] bg-white p-6 shadow-sm">
              <dl className="grid gap-4 text-sm">
                <div>
                  <dt className="text-slate-500">Name</dt>
                  <dd className="font-medium text-slate-900">{credentialDisplayName(credential)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Issuer</dt>
                  <dd className="break-all text-slate-900">{issuerDisplayLabel(credential.issuer)}</dd>
                  <dd className="mt-1 break-all text-xs text-slate-600">{credential.issuer}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Type</dt>
                  <dd className="break-all font-medium text-slate-900">{credential.credential_type}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Identifier</dt>
                  <dd className="break-all font-mono text-xs text-slate-800">{credential.id}</dd>
                </div>
                {credential.issued_at && (
                  <div>
                    <dt className="text-slate-500">Issued</dt>
                    <dd className="text-slate-900">{credential.issued_at}</dd>
                  </div>
                )}
                {credential.expires_at && (
                  <div>
                    <dt className="text-slate-500">Expires</dt>
                    <dd className="text-slate-900">{credential.expires_at}</dd>
                  </div>
                )}
                {credential.status && (
                  <div>
                    <dt className="text-slate-500">Status</dt>
                    <dd className="text-slate-900">{credential.status}</dd>
                  </div>
                )}
              </dl>
            </article>
          </section>
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

export function CredentialDetailPage() {
  const { credentialId } = useParams<{ credentialId: string }>()
  if (!credentialId) {
    return <Navigate to={routes.credentials} replace />
  }
  return <CredentialDetailBody key={credentialId} credentialId={credentialId} />
}
