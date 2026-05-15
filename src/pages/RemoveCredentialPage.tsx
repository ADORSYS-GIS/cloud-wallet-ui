import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { deleteCredential } from '../api/credentials'
import { Header } from '../components/Header'
import { RemoveCredentialAccordion } from '../components/credentials/RemoveCredentialAccordion'
import { PageErrorBanner } from '../components/feedback/PageErrorBanner'
import { PageContainer } from '../components/layout/PageContainer'
import { credentialDetailPath, routes } from '../constants/routes'
import { markCredentialRemoved } from '../state/deletedCredentials'
import { credentialDeleteErrorMessage } from '../utils/credentialDeleteErrors'

const NOT_LOST_ITEMS = [
  'Your credential within the system that issued you your credential.',
  'The issuing organization as a Contact.',
] as const

const RESTORE_ITEMS = [
  'You will have to go the organization that issued you this credential and request it again',
] as const

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-[14px] leading-relaxed text-slate-800">
          <span
            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-700"
            aria-hidden
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function RemoveCredentialPage() {
  const { credentialId } = useParams<{ credentialId: string }>()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const dismissError = () => {
    setErrorMessage(null)
  }

  if (!credentialId) {
    return <Navigate to={routes.credentials} replace />
  }

  const handleRemoveFromWallet = async () => {
    setDeleting(true)
    setErrorMessage(null)

    try {
      await deleteCredential(credentialId)
      markCredentialRemoved(credentialId)
      navigate(routes.credentials, { replace: true })
    } catch (error: unknown) {
      setErrorMessage(credentialDeleteErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <PageContainer fullWidth>
      <div className="flex h-dvh w-full flex-col overflow-hidden rounded-none bg-[#E9ECEF] font-serif">
        <div className="shrink-0">
          <Header
            title="Remove Credential"
            hidePwaBanner
            leftSlot={
              <button
                type="button"
                onClick={() => navigate(credentialDetailPath(credentialId))}
                disabled={deleting}
                className="h-10 w-10 rounded-full text-4xl leading-none text-white disabled:opacity-50"
                aria-label="Back to credential details"
              >
                ‹
              </button>
            }
          />
        </div>

        {errorMessage && (
          <PageErrorBanner message={errorMessage} onDismiss={dismissError} />
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          <section className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-5">
            <h2 className="text-[17px] font-bold text-slate-900">
              Remove credentials from your wallet
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-800">
              You will lose your ability to prove the information on this credential with
              this Wallet.
            </p>

            <div className="mt-6 border-y border-slate-400/90 divide-y divide-slate-400/90">
              <RemoveCredentialAccordion title="You will not lose" defaultExpanded>
                <BulletList items={NOT_LOST_ITEMS} />
              </RemoveCredentialAccordion>

              <RemoveCredentialAccordion title="How to get this credential back" defaultExpanded>
                <BulletList items={RESTORE_ITEMS} />
              </RemoveCredentialAccordion>
            </div>

          </section>

          <div className="shrink-0 border-t border-slate-200 bg-[#E9ECEF] px-2 pb-1">
            <button
              type="button"
              onClick={() => void handleRemoveFromWallet()}
              disabled={deleting}
              aria-busy={deleting}
              className="h-9 w-full rounded-md bg-red-600 text-center text-base font-semibold text-white shadow-[0_2px_7px_rgba(0,0,0,0.22)] transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {deleting ? 'Removing…' : 'Remove from wallet'}
            </button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
