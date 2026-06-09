import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { PageErrorBanner } from '../components/feedback/PageErrorBanner'
import { PageContainer } from '../components/layout/PageContainer'
import { Header } from '../components/Header'
import { SharedClaimsCredentialCard } from '../components/presentation/SharedClaimsCredentialCard'
import { routes } from '../constants/routes'
import { usePresentationActivityDetail } from '../hooks/usePresentationActivityDetail'
import { disclosedClaimCountDetailLabel } from '../utils/presentationActivityErrors'
import {
  credentialTypeDescription,
  credentialTypeDisplayName,
  isPresentationActivityId,
  verifierDisplayLabel,
} from '../utils/presentationActivity'

export function PresentationActivityDetailPage() {
  const { activityId } = useParams<{ activityId: string }>()
  const navigate = useNavigate()
  const { record, loading, errorMessage, clearError } =
    usePresentationActivityDetail(activityId)

  const [showAllDetails, setShowAllDetails] = useState(false)

  if (!activityId || !isPresentationActivityId(activityId)) {
    return <Navigate to={routes.presentationActivity} replace />
  }

  const verifierLabel = record ? verifierDisplayLabel(record.verifier) : ''
  const primaryCredentialType = record?.credential_types[0]
  const credentialTitle = primaryCredentialType
    ? credentialTypeDisplayName(primaryCredentialType)
    : 'Credential'
  const description = primaryCredentialType
    ? credentialTypeDescription(primaryCredentialType)
    : undefined

  return (
    <PageContainer fullWidth>
      <div className="flex h-dvh w-full flex-col overflow-hidden rounded-none bg-[#E9ECEF] font-serif">
        <Header
          title="Shared Claims"
          hidePwaBanner
          compact
          leftSlot={
            <button
              type="button"
              onClick={() => navigate(routes.presentationActivity)}
              className="h-10 w-10 rounded-full text-4xl leading-none text-white"
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
            <SharedClaimsCredentialCard
              credentialTitle={credentialTitle}
              verifierLabel={verifierLabel}
              description={description}
              logoUri={record.verifier.logo_uri ?? null}
            />

            <div className="mt-6">
              <p className="text-[15px] font-bold text-slate-900">Description:</p>
              <div className="mt-2 rounded-md border border-slate-300 bg-white px-4 py-3">
                <p className="text-[14px] leading-relaxed text-slate-800">
                  {description ?? 'No description available for this credential.'}
                </p>
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAllDetails((prev) => !prev)}
                  className="text-[14px] font-medium text-[#4b7c8c] hover:underline"
                >
                  {showAllDetails ? 'Show Less' : 'Show All'}
                </button>
              </div>
            </div>

            {showAllDetails && (
              <div className="mt-4 space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4 text-[14px] text-slate-700">
                <p>
                  <span className="font-semibold text-slate-900">Verifier: </span>
                  {record.verifier.client_id}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Credential types: </span>
                  {record.credential_types.length > 0
                    ? record.credential_types.join(', ')
                    : '—'}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Claims shared: </span>
                  {disclosedClaimCountDetailLabel(record.disclosed_claim_count)}
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </PageContainer>
  )
}
