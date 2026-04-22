import { useCallback, useState } from 'react'
import { IssuanceError, startIssuanceSession } from '../api/issuance'
import type { IssuanceApiError, StartIssuanceResponse } from '../types/issuance'
import { useCredentialOfferState } from '../state/issuance.state'

// ---------------------------------------------------------------------------
// State machine types
// ---------------------------------------------------------------------------

export type IssuanceOfferState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; session: StartIssuanceResponse }
  | { status: 'error'; apiError: IssuanceApiError; rawMessage: string }

// ---------------------------------------------------------------------------
// Human-readable error messages mapped from spec error codes.
// ---------------------------------------------------------------------------

function userFacingMessage(error: IssuanceApiError): string {
  if (error.error_description) {
    return error.error_description
  }

  switch (error.error) {
    case 'invalid_credential_offer':
      return 'The scanned QR code does not contain a valid credential offer. Please try again.'
    case 'unauthorized':
      return 'Authentication failed. Please restart the app and try again.'
    case 'issuer_metadata_fetch_failed':
      return 'Could not reach the credential issuer. Check your connection and try again.'
    case 'auth_server_metadata_fetch_failed':
      return 'Could not reach the authorization server. Check your connection and try again.'
    case 'internal_error':
      return 'An unexpected error occurred on the server. Please try again later.'
    default:
      return error.httpStatus >= 500
        ? 'The server encountered an error. Please try again later.'
        : 'The credential offer could not be processed. Please try a different QR code.'
  }
}

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
        if (err instanceof IssuanceError) {
          const apiError: IssuanceApiError = {
            httpStatus: err.httpStatus,
            error: err.error,
            error_description: err.error_description,
          }
          const message = userFacingMessage(apiError)
          setOfferState({ status: 'error', apiError, rawMessage: message })
          setError(apiError, message)
        } else {
          // Network-level failure (offline, DNS, etc.)
          const message =
            err instanceof Error && err.message
              ? err.message
              : 'Network error. Please check your connection and try again.'

          const apiError: IssuanceApiError = {
            httpStatus: 0,
            error: 'internal_error',
            error_description: null,
          }
          setOfferState({ status: 'error', apiError, rawMessage: message })
          setError(apiError, message)
        }
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
