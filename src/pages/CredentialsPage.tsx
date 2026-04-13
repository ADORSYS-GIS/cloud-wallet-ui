import { useNavigate } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { CredentialSummaryCard } from '../components/credentials/CredentialSummaryCard'
import { CredentialsEmptyState } from '../components/credentials/CredentialsEmptyState'
import { PageContainer } from '../components/layout/PageContainer'
import { routes } from '../constants/routes'
import { useCredentials } from '../hooks/useCredentials'

export function CredentialsPage() {
  const navigate = useNavigate()
  const { credentials, loading } = useCredentials()

  return (
    <PageContainer>
      <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#E9ECEF]">
        <Header title="Your Credentials" />

        {loading && (
          <section className="flex flex-1 items-center justify-center bg-[#E9ECEF] py-16 text-slate-600">
            Loading credentials…
          </section>
        )}

        {!loading && credentials.length === 0 && <CredentialsEmptyState />}

        {!loading && credentials.length > 0 && (
          <section className="min-h-0 flex-1 overflow-y-auto bg-[#E9ECEF] px-3 py-3">
            <div className="mx-auto flex max-w-lg flex-col gap-3">
              {credentials.map((c) => (
                <CredentialSummaryCard key={c.id} credential={c} />
              ))}
            </div>
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
