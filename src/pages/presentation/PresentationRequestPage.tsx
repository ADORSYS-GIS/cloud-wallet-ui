import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PresentationErrorCard } from '../../components/presentation/PresentationErrorCard'
import { PresentationLoadingState } from '../../components/presentation/PresentationLoadingState'
import { PresentationPageShell } from '../../components/presentation/PresentationPageShell'
import { routes } from '../../constants/routes'
import { usePresentationConsent } from '../../hooks/presentation/usePresentationConsent'
import { usePresentationSession } from '../../hooks/presentation/usePresentationSession'
import { usePresentationState } from '../../state/presentation.state'
import { parsePresentationRequestParams } from '../../utils/presentation/presentationRequest'
import { ProofDetailsPage } from './ProofDetailsPage'

export function PresentationRequestPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { sessionState, startRequest, reset } = usePresentationSession()
  const { consentState, submitShare, submitDecline } = usePresentationConsent()
  const presentation = usePresentationState()

  const parsedParams = useMemo(
    () => parsePresentationRequestParams(searchParams),
    [searchParams]
  )

  useEffect(() => {
    if (!parsedParams.ok) {
      return
    }

    const flowAlreadyStarted =
      presentation.status !== 'idle' && presentation.status !== 'error'
    if (flowAlreadyStarted || sessionState.status === 'loading') {
      return
    }

    void startRequest(parsedParams.authorization)
  }, [parsedParams, presentation.status, sessionState.status, startRequest])

  const handleBack = () => {
    reset()
    navigate(routes.home)
  }

  const handleRetry = () => {
    if (!parsedParams.ok) {
      navigate(routes.scan)
      return
    }
    reset()
    void startRequest(parsedParams.authorization)
  }

  const handleDecline = () => {
    void submitDecline().then(() => {
      reset()
      navigate(routes.home)
    })
  }

  const handleShare = () => {
    void submitShare()
  }

  const isSubmitting =
    consentState.status === 'submitting' || presentation.status === 'submitting'

  const showProofDetails =
    parsedParams.ok &&
    presentation.status === 'selecting' &&
    presentation.verifier &&
    presentation.credentialMatches

  const showLoading =
    parsedParams.ok &&
    (sessionState.status === 'loading' || presentation.status === 'loading')

  const showSubmitting = parsedParams.ok && isSubmitting

  const showSuccess =
    parsedParams.ok && presentation.status === 'success' && presentation.consentResponse

  const showError =
    parsedParams.ok &&
    (sessionState.status === 'error' ||
      presentation.status === 'error' ||
      consentState.status === 'error')

  return (
    <PresentationPageShell
      title={showProofDetails || showSubmitting ? 'Proof Details' : 'Proof Request'}
      onBack={handleBack}
      showFooter={!showProofDetails && !showSubmitting}
    >
      <section className="flex min-h-0 flex-1 flex-col">
        {!parsedParams.ok && (
          <PresentationErrorCard
            error={parsedParams.error}
            onRetry={() => navigate(routes.scan)}
            retryLabel="Scan QR code"
          />
        )}

        {showLoading && <PresentationLoadingState />}

        {showSubmitting && (
          <PresentationLoadingState message="Submitting your response…" />
        )}

        {showError && !showSubmitting && (
          <PresentationErrorCard
            error={
              sessionState.status === 'error'
                ? sessionState.error
                : consentState.status === 'error'
                  ? consentState.error
                  : (presentation.error ?? {
                      code: 'internal_error',
                      message: 'Presentation request failed.',
                    })
            }
            onRetry={handleRetry}
          />
        )}

        {showSuccess && (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-900">Presentation completed</p>
            <p className="mt-2 text-sm text-slate-600">
              Your credentials were shared successfully.
            </p>
            <button
              type="button"
              onClick={() => {
                reset()
                navigate(routes.home)
              }}
              className="mt-6 h-10 rounded-[4px] bg-[#99e827] px-6 text-[16px] text-slate-900"
            >
              Return to wallet
            </button>
          </div>
        )}

        {showProofDetails && presentation.verifier && presentation.credentialMatches && (
          <ProofDetailsPage
            verifier={presentation.verifier}
            credentialMatches={presentation.credentialMatches}
            onShare={handleShare}
            onDecline={handleDecline}
            isSubmitting={isSubmitting}
          />
        )}
      </section>
    </PresentationPageShell>
  )
}
