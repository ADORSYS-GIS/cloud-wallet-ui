import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PresentationErrorCard } from '../../components/presentation/PresentationErrorCard'
import { PresentationLoadingState } from '../../components/presentation/PresentationLoadingState'
import { PresentationPageShell } from '../../components/presentation/PresentationPageShell'
import { routes } from '../../constants/routes'
import { usePresentationSession } from '../../hooks/presentation/usePresentationSession'
import { usePresentationState } from '../../state/presentation.state'
import { parsePresentationRequestParams } from '../../utils/presentation/presentationRequest'
import { ProofDetailsPage } from './ProofDetailsPage'

export function PresentationRequestPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { sessionState, startRequest, reset } = usePresentationSession()
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
    reset()
    navigate(routes.home)
  }

  const handleShare = () => {
    presentation.setStatus('reviewing')
  }

  const showProofDetails =
    parsedParams.ok &&
    presentation.status === 'selecting' &&
    presentation.request &&
    presentation.verifier

  const showLoading =
    parsedParams.ok &&
    (sessionState.status === 'loading' || presentation.status === 'loading')

  const showError =
    parsedParams.ok &&
    (sessionState.status === 'error' || presentation.status === 'error')

  return (
    <PresentationPageShell
      title={showProofDetails ? 'Proof Details' : 'Proof Request'}
      onBack={handleBack}
      showFooter={!showProofDetails}
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

        {showError && (
          <PresentationErrorCard
            error={
              sessionState.status === 'error'
                ? sessionState.error
                : (presentation.error ?? {
                    code: 'internal_error',
                    message: 'Presentation request failed.',
                  })
            }
            onRetry={handleRetry}
          />
        )}

        {showProofDetails && presentation.request && presentation.verifier && (
          <ProofDetailsPage
            request={presentation.request}
            verifier={presentation.verifier}
            onShare={handleShare}
            onDecline={handleDecline}
          />
        )}
      </section>
    </PresentationPageShell>
  )
}
