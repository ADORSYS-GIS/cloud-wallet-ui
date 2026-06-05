import { useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PresentationErrorCard } from '../../components/presentation/PresentationErrorCard'
import { PresentationLoadingState } from '../../components/presentation/PresentationLoadingState'
import { PresentationPageShell } from '../../components/presentation/PresentationPageShell'
import { routes } from '../../constants/routes'
import { usePresentationSession } from '../../hooks/presentation/usePresentationSession'
import { parsePresentationRequestParams } from '../../utils/presentation/presentationRequest'

export function PresentationRequestPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { sessionState, startRequest, reset } = usePresentationSession()
  const hasStartedRef = useRef(false)

  const parsedParams = useMemo(
    () => parsePresentationRequestParams(searchParams),
    [searchParams]
  )

  useEffect(() => {
    if (!parsedParams.ok || hasStartedRef.current) {
      return
    }
    hasStartedRef.current = true
    void startRequest(parsedParams.authorization)
  }, [parsedParams, startRequest])

  const handleBack = () => {
    reset()
    navigate(routes.home)
  }

  const handleRetry = () => {
    if (!parsedParams.ok) {
      navigate(routes.scan)
      return
    }
    hasStartedRef.current = false
    reset()
    hasStartedRef.current = true
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
