import { useCallback, useState } from 'react'
import { startPresentation } from '../../api/presentation/start'
import { usePresentationState } from '../../state/presentation.state'
import type {
  PresentationAuthorizationRequest,
  PresentationError,
} from '../../types/presentation'
import { toPresentationError } from '../../utils/presentation/presentationErrors.ts'

export type PresentationSessionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success' }
  | { status: 'error'; error: PresentationError }

export type UsePresentationSessionReturn = {
  sessionState: PresentationSessionState
  startRequest: (authorization: PresentationAuthorizationRequest) => Promise<void>
  reset: () => void
}

export function usePresentationSession(): UsePresentationSessionReturn {
  const [sessionState, setSessionState] = useState<PresentationSessionState>({
    status: 'idle',
  })

  const presentation = usePresentationState()

  const startRequest = useCallback(
    async (authorization: PresentationAuthorizationRequest) => {
      if (presentation.status === 'loading') {
        return
      }

      setSessionState({ status: 'loading' })
      presentation.clear()
      presentation.setStatus('loading')

      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : undefined
        const response = await startPresentation(authorization, origin)
        presentation.setSession(response, authorization.client_id)
        setSessionState({ status: 'success' })
      } catch (error: unknown) {
        const apiError = toPresentationError(error)
        presentation.setError(apiError)
        setSessionState({ status: 'error', error: apiError })
      }
    },
    [presentation]
  )

  const reset = useCallback(() => {
    setSessionState({ status: 'idle' })
    presentation.clear()
  }, [presentation])

  return { sessionState, startRequest, reset }
}
