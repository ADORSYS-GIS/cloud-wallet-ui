import { useCallback, useRef, useState } from 'react'
import { startPresentation } from '../../api/presentation/start'
import { usePresentationState } from '../../state/presentation.state'
import type {
  PresentationError,
  StartPresentationRequest,
} from '../../types/presentation'
import { toPresentationError } from '../../utils/presentation/presentationErrors.ts'

export type PresentationSessionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success' }
  | { status: 'error'; error: PresentationError }

export type StartPresentationResult =
  | { ok: true }
  | { ok: false; error: PresentationError }

export type UsePresentationSessionReturn = {
  sessionState: PresentationSessionState
  /** Submit a raw OID4VP authorization request to the wallet backend. */
  startRequest: (body: StartPresentationRequest) => Promise<StartPresentationResult>
  reset: () => void
}

function requestKey(body: StartPresentationRequest): string {
  return JSON.stringify(body)
}

export function usePresentationSession(): UsePresentationSessionReturn {
  const [sessionState, setSessionState] = useState<PresentationSessionState>({
    status: 'idle',
  })

  const { clear, setStatus, setStartResponse, setError } = usePresentationState()
  const inFlightKeyRef = useRef<string | null>(null)

  const startRequest = useCallback(
    async (body: StartPresentationRequest): Promise<StartPresentationResult> => {
      const key = requestKey(body)
      if (inFlightKeyRef.current === key) {
        return {
          ok: false,
          error: { code: 'internal_error', message: 'Request already in progress.' },
        }
      }

      inFlightKeyRef.current = key
      setSessionState({ status: 'loading' })
      clear()
      setStatus('loading')

      try {
        const response = await startPresentation(body)
        setStartResponse(response)
        setStatus('selecting')
        setSessionState({ status: 'success' })
        return { ok: true }
      } catch (error: unknown) {
        const apiError = toPresentationError(error)
        setError(apiError)
        setSessionState({ status: 'error', error: apiError })
        return { ok: false, error: apiError }
      } finally {
        inFlightKeyRef.current = null
      }
    },
    [clear, setError, setStartResponse, setStatus]
  )

  const reset = useCallback(() => {
    setSessionState({ status: 'idle' })
    clear()
  }, [clear])

  return { sessionState, startRequest, reset }
}
