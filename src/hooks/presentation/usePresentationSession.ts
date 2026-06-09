import { useCallback, useRef, useState } from 'react'
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

export type StartPresentationResult =
  | { ok: true }
  | { ok: false; error: PresentationError }

export type UsePresentationSessionReturn = {
  sessionState: PresentationSessionState
  /** Validate and submit an OpenID4VP authorization request to the wallet backend. */
  startRequest: (
    authorization: PresentationAuthorizationRequest
  ) => Promise<StartPresentationResult>
  reset: () => void
}

function authorizationKey(authorization: PresentationAuthorizationRequest): string {
  return JSON.stringify(authorization)
}

export function usePresentationSession(): UsePresentationSessionReturn {
  const [sessionState, setSessionState] = useState<PresentationSessionState>({
    status: 'idle',
  })

  const { clear, setStatus, setRequest, setVerifier, setMatchingCredentials, setError } =
    usePresentationState()
  const inFlightKeyRef = useRef<string | null>(null)

  const startRequest = useCallback(
    async (
      authorization: PresentationAuthorizationRequest
    ): Promise<StartPresentationResult> => {
      const requestKey = authorizationKey(authorization)
      if (inFlightKeyRef.current === requestKey) {
        return {
          ok: false,
          error: { code: 'internal_error', message: 'Request already in progress.' },
        }
      }

      inFlightKeyRef.current = requestKey
      setSessionState({ status: 'loading' })
      clear()
      setStatus('loading')

      try {
        const response = await startPresentation(authorization)
        setRequest(response.request)
        setVerifier(response.verifier)
        setMatchingCredentials(response.matching_credentials)
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
    [clear, setError, setMatchingCredentials, setRequest, setStatus, setVerifier]
  )

  const reset = useCallback(() => {
    setSessionState({ status: 'idle' })
    clear()
  }, [clear])

  return { sessionState, startRequest, reset }
}
