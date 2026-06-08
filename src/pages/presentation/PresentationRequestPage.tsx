import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PresentationErrorCard } from '../../components/presentation/PresentationErrorCard'
import { PresentationLoadingState } from '../../components/presentation/PresentationLoadingState'
import { PresentationPageShell } from '../../components/presentation/PresentationPageShell'
import { routes } from '../../constants/routes'
import { usePresentationSession } from '../../hooks/presentation/usePresentationSession'
import { usePresentationState } from '../../state/presentation.state'
import { parsePresentationRequestParams } from '../../utils/presentation/presentationRequest'

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

  return (
    <PresentationPageShell title="Proof Request" onBack={handleBack}>
      <section className="flex flex-1 flex-col">
        {!parsedParams.ok && (
          <PresentationErrorCard
            error={parsedParams.error}
            onRetry={() => navigate(routes.scan)}
            retryLabel="Scan QR code"
          />
        )}

        {parsedParams.ok && sessionState.status === 'loading' && (
          <PresentationLoadingState />
        )}

        {parsedParams.ok && sessionState.status === 'error' && (
          <PresentationErrorCard error={sessionState.error} onRetry={handleRetry} />
        )}
      </section>
    </PresentationPageShell>
  )
}
