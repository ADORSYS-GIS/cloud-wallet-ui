import { useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { PresentationLoadingState } from '../../components/presentation/PresentationLoadingState'
import { PresentationPageShell } from '../../components/presentation/PresentationPageShell'
import { routes } from '../../constants/routes'
import { usePresentationSession } from '../../hooks/presentation/usePresentationSession'
import { usePresentationState } from '../../state/presentation.state'
import { parsePresentationRequestParams } from '../../utils/presentation/presentationRequest'

export function PresentationRequestPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { sessionState, startRequest, reset } = usePresentationSession()
  const presentation = usePresentationState()
  const redirectedToErrorRef = useRef(false)

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

  useEffect(() => {
    if (redirectedToErrorRef.current) {
      return
    }

    if (!parsedParams.ok) {
      redirectedToErrorRef.current = true
      presentation.setError(parsedParams.error)
      navigate(routes.presentationError, {
        replace: true,
        state: { retryPath: routes.scan },
      })
      return
    }

    if (sessionState.status === 'error') {
      redirectedToErrorRef.current = true
      navigate(routes.presentationError, {
        replace: true,
        state: {
          retryPath: `${routes.present}${location.search}`,
        },
      })
    }
  }, [parsedParams, sessionState, presentation, navigate, location.search])

  const handleBack = () => {
    reset()
    navigate(routes.home)
  }

  return (
    <PresentationPageShell title="Proof Request" onBack={handleBack}>
      <section className="flex flex-1 flex-col">
        {parsedParams.ok && sessionState.status === 'loading' && (
          <PresentationLoadingState />
        )}
      </section>
    </PresentationPageShell>
  )
}
