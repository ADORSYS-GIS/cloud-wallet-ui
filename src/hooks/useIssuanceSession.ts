import { useCallback, useState } from 'react'
import { startIssuanceSession } from '../api/issuance'
import type { IssuanceApiError, StartIssuanceResponse } from '../types/issuance'
import { useCredentialOfferState } from '../state/issuance.state'
import { issuanceUserMessage, toIssuanceApiError } from '../utils/issuanceErrors'
import { parseCredentialOfferInput } from '../utils/credentialOffer'

export type IssuanceOfferState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; session: StartIssuanceResponse; credentialIssuerUrl?: string }
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

      // Parse the offer to extract credential_issuer URL for display
      let credentialIssuerUrl: string | undefined
      try {
        const parsed = parseCredentialOfferInput(rawOffer)
        if (parsed) {
          // Extract credential_issuer from the parsed offer
          const params = new URLSearchParams(new URL(parsed.normalizedUri).search)
          const credentialOffer = params.get('credential_offer')
          if (credentialOffer) {
            const decoded = decodeURIComponent(credentialOffer)
            const offerObj = JSON.parse(decoded) as { credential_issuer?: string }
            credentialIssuerUrl = offerObj.credential_issuer
          }
        }
      } catch {
        // Ignore parsing errors - the API will handle validation
      }

      try {
        const session = await startIssuanceSession(rawOffer)
        setOfferState({ status: 'success', session, credentialIssuerUrl })
        setOffer(session, credentialIssuerUrl)
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
