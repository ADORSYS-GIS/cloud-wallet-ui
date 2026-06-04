import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { PageErrorBanner } from '../components/feedback/PageErrorBanner'
import { PageContainer } from '../components/layout/PageContainer'
import { IssuerAvatar } from '../components/issuance/IssuerAvater'
import { DeletePresentationActivityDialog } from '../components/presentation/DeletePresentationActivityDialog'
import { routes } from '../constants/routes'
import { usePresentationActivityDetail } from '../hooks/usePresentationActivityDetail'
import {
  formatPresentationTimestamp,
  isPresentationActivityId,
  verifierDisplayLabel,
} from '../utils/presentationActivity'

export function PresentationActivityDetailPage() {
  const { activityId } = useParams<{ activityId: string }>()
  const navigate = useNavigate()
  const { record, loading, errorMessage, deleting, forget, clearError } =
    usePresentationActivityDetail(activityId)

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  if (!activityId || !isPresentationActivityId(activityId)) {
    return <Navigate to={routes.presentationActivity} replace />
  }

  const handleForget = async () => {
    try {
      await forget()
      setConfirmDeleteOpen(false)
      navigate(routes.presentationActivity, { replace: true })
    } catch {
      setConfirmDeleteOpen(false)
    }
  }

  const verifierLabel = record ? verifierDisplayLabel(record.verifier) : ''

  return (
    <PageContainer>
      <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#E9ECEF] font-serif">
        <Header
          title="Presentation Details"
          hidePwaBanner
          leftSlot={
            <button
              type="button"
              onClick={() => navigate(routes.presentationActivity)}
              disabled={deleting}
              className="h-10 w-10 rounded-full text-4xl leading-none text-white disabled:opacity-50"
              aria-label="Back to activity"
            >
              ‹
            </button>
          }
        />

        {errorMessage && (
          <PageErrorBanner message={errorMessage} onDismiss={clearError} />
        )}

        {loading && (
          <section className="flex flex-1 items-center justify-center text-slate-600">
            Loading…
          </section>
        )}

        {!loading && record && (
          <section className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-4">
                <IssuerAvatar
                  displayName={verifierLabel}
                  logoUri={record.verifier.logo_uri ?? null}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-900">
                    {verifierLabel}
                  </p>
                  <p className="mt-0.5 break-all text-[13px] text-slate-500">
                    {record.verifier.client_id}
                  </p>
                </div>
              </div>

              <dl className="mt-6 space-y-4">
                <div>
                  <dt className="text-[13px] font-medium text-slate-500">Presented</dt>
                  <dd className="mt-1 text-[15px] text-slate-900">
                    {formatPresentationTimestamp(record.presented_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] font-medium text-slate-500">
                    Credential types shared
                  </dt>
                  <dd className="mt-1 text-[15px] text-slate-900">
                    {record.credential_types.length > 0
                      ? record.credential_types.join(', ')
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] font-medium text-slate-500">
                    Claims shared
                  </dt>
                  <dd className="mt-1 text-[15px] text-slate-900">
                    {record.disclosed_claim_count} (metadata only — values are not stored)
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={deleting}
                className="mt-8 w-full rounded-md border border-red-200 bg-red-50 py-3 text-center text-[15px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Delete from history
              </button>
            </div>
          </section>
        )}

        <Footer
          activeTab="activity"
          onScanClick={() => navigate(`${routes.scan}?fresh=true`)}
          scanDisabled={deleting}
        />
      </div>

      <DeletePresentationActivityDialog
        open={confirmDeleteOpen}
        verifierLabel={verifierLabel || 'this verifier'}
        deleting={deleting}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleForget()}
      />
    </PageContainer>
  )
}
