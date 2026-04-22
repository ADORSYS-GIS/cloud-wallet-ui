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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type UseIssuanceSessionReturn = {
  offerState: IssuanceOfferState
  /** Submit a raw credential offer URI/string returned from the QR scanner. */
  submitOffer: (rawOffer: string) => Promise<void>
  /** Reset to idle — allows re-scanning after a success or error. */
  reset: () => void
}

export function useIssuanceSession(): UseIssuanceSessionReturn {
  const [offerState, setOfferState] = useState<IssuanceOfferState>({ status: 'idle' })

  // Push outcomes into the shared context so other pages (e.g. CredentialsPage)
  // can react to the successful issuance without prop drilling.
  const offerContext = useCredentialOfferState()

  const submitOffer = useCallback(
    async (rawOffer: string) => {
      setOfferState({ status: 'loading' })
      offerContext.setLoading()

      try {
        const session = await startIssuanceSession(rawOffer)
        setOfferState({ status: 'success', session })
        offerContext.setOffer(session)
      } catch (err: unknown) {
        const apiError: IssuanceApiError = toIssuanceApiError(err)
        const message =
          err instanceof Error && apiError.httpStatus === 0
            ? err.message
            : issuanceUserMessage(apiError)
        setOfferState({ status: 'error', apiError, rawMessage: message })
        offerContext.setError(apiError, message)
      }
    },
    [offerContext]
  )

  const reset = useCallback(() => {
    setOfferState({ status: 'idle' })
    offerContext.clear()
  }, [offerContext])

  return { offerState, submitOffer, reset }
}
