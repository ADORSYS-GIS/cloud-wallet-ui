import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { CredentialSummaryCard } from '../components/credentials/CredentialSummaryCard'
import { CredentialsEmptyState } from '../components/credentials/CredentialsEmptyState'
import { DeleteSuccessBanner } from '../components/credentials/DeleteSuccessBanner'
import { PageContainer } from '../components/layout/PageContainer'
import { routes } from '../constants/routes'
import { useCredentials } from '../hooks/useCredentials'
import {
  isCredentialRemoved,
  getAllRemovedCredentials,
  clearRemovedCredential,
} from '../state/deletedCredentials'

export function CredentialsPage() {
  const navigate = useNavigate()
  const { credentials, loading } = useCredentials()
  const [deletedCredential, setDeletedCredential] = useState<{
    id: string
    name: string
  } | null>(null)

  // Show banner for the most recently deleted credential (only check once)
  const visibleCredentials = useMemo(() => {
    const removed = getAllRemovedCredentials()
    // Derive the deleted credential during render (no setState here)
    if (removed.length > 0 && deletedCredential === null) {
      // Schedule state update after render completes
      queueMicrotask(() => {
        setDeletedCredential(removed[removed.length - 1])
      })
    }
    return credentials.filter((credential) => !isCredentialRemoved(credential.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials])

  const handleDismissBanner = () => {
    if (deletedCredential) {
      clearRemovedCredential(deletedCredential.id)
      setDeletedCredential(null)
    }
  }

  return (
    <PageContainer>
      {deletedCredential && (
        <DeleteSuccessBanner
          credentialName={deletedCredential.name}
          onDismiss={handleDismissBanner}
        />
      )}
      <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#E9ECEF] font-serif">
        <Header
          title="Your Credentials"
          leftSlot={
            <button
              type="button"
              onClick={() => navigate(routes.home)}
              className="h-10 w-10 rounded-full text-4xl leading-none text-white"
              aria-label="Back to home"
            >
              ‹
            </button>
          }
        />

        {loading && (
          <section className="flex flex-1 items-center justify-center bg-[#E9ECEF] py-16 text-slate-600">
            Loading credentials…
          </section>
        )}

        {!loading && visibleCredentials.length === 0 && <CredentialsEmptyState />}

        {!loading && visibleCredentials.length > 0 && (
          <section className="min-h-0 flex-1 overflow-y-auto bg-[#E9ECEF] py-4">
            <div className="flex flex-col gap-4 px-4">
              {visibleCredentials.map((c) => (
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
