import { useCallback, useState } from 'react'
import { startIssuanceSession } from '../api/issuance'
import type { IssuanceApiError, StartIssuanceResponse } from '../types/issuance'
import { useCredentialOfferState } from '../state/issuance.state'
import { issuanceUserMessage, toIssuanceApiError } from '../utils/issuanceErrors'

export type IssuanceOfferState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; session: StartIssuanceResponse }
  | { status: 'error'; apiError: IssuanceApiError; rawMessage: string }

export type UseIssuanceSessionReturn = {
  offerState: IssuanceOfferState
  /** Submit a raw credential offer URI/string returned from the QR scanner. */
  submitOffer: (rawOffer: string) => Promise<void>
  /** Reset to idle — allows re-scanning after a success or error. */
  reset: () => void
}

export function useIssuanceSession(): UseIssuanceSessionReturn {
  const [offerState, setOfferState] = useState<IssuanceOfferState>({ status: 'idle' })

  const { setLoading, setOffer, setError, clear } = useCredentialOfferState()

  const submitOffer = useCallback(
    async (rawOffer: string) => {
      setOfferState({ status: 'loading' })
      setLoading()

      try {
        const session = await startIssuanceSession(rawOffer)
        setOfferState({ status: 'success', session })
        setOffer(session)
      } catch (err: unknown) {
        const apiError: IssuanceApiError = toIssuanceApiError(err)
        const message =
          err instanceof Error && apiError.httpStatus === 0
            ? err.message
            : issuanceUserMessage(apiError)
        setOfferState({ status: 'error', apiError, rawMessage: message })
        setError(apiError, message)
      }
    },
    [setError, setLoading, setOffer]
  )

  const reset = useCallback(() => {
    setOfferState({ status: 'idle' })
    clear()
  }, [clear])

  return { offerState, submitOffer, reset }
}
