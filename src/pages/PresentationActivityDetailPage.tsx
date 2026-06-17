import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { PageErrorBanner } from '../components/feedback/PageErrorBanner'
import { FlowSubHeader } from '../components/layout/FlowSubHeader'
import { FlowSubHeaderCard } from '../components/layout/FlowSubHeaderCard'
import { PageContainer } from '../components/layout/PageContainer'
import { SharedClaimsCredentialCard } from '../components/presentation/SharedClaimsCredentialCard'
import { routes } from '../constants/routes'
import { usePresentationActivityDetail } from '../hooks/usePresentationActivityDetail'
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
  const descriptionText = description ?? 'No description available for this credential.'

  return (
    <PageContainer fullWidth>
      <div className="flex h-screen w-full flex-col overflow-hidden rounded-none bg-[#e9ecef] font-serif">
        <FlowSubHeader
          title="Shared Claims"
          onBack={() => navigate(routes.presentationActivity)}
          backLabel="Back to activity"
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
          <>
            <FlowSubHeaderCard>
              <SharedClaimsCredentialCard
                credentialTitle={credentialTitle}
                verifierLabel={verifierLabel}
                description={description}
                logoUri={record.verifier.logo_uri ?? null}
              />
            </FlowSubHeaderCard>

            <section className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="mt-2">
                <p className="text-[15px] font-bold text-slate-900">Description:</p>
                <div className="mt-2 rounded-md border border-slate-300 bg-white px-4 py-3">
                  <p
                    className={[
                      'text-[14px] leading-relaxed text-slate-800',
                      showAllDetails ? '' : 'line-clamp-2',
                    ].join(' ')}
                  >
                    {descriptionText}
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
            </section>
          </>
        )}
      </div>
    </PageContainer>
  )
}
