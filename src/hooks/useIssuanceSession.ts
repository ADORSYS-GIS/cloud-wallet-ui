import { useCallback, useState } from 'react'
import { IssuanceError, startIssuanceSession } from '../api/issuance'
import type { IssuanceApiError, StartIssuanceResponse } from '../types/issuance'

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

  const submitOffer = useCallback(async (rawOffer: string) => {
    setOfferState({ status: 'loading' })

    try {
      const session = await startIssuanceSession(rawOffer)
      setOfferState({ status: 'success', session })
    } catch (err: unknown) {
      if (err instanceof IssuanceError) {
        setOfferState({
          status: 'error',
          apiError: {
            httpStatus: err.httpStatus,
            error: err.error,
            error_description: err.error_description,
          },
          rawMessage: userFacingMessage({
            httpStatus: err.httpStatus,
            error: err.error,
            error_description: err.error_description,
          }),
        })
      } else {
        // Network-level failure (offline, DNS, etc.)
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'Network error. Please check your connection and try again.'

        setOfferState({
          status: 'error',
          apiError: { httpStatus: 0, error: 'internal_error', error_description: null },
          rawMessage: message,
        })
      }
    }
  }, [])

  const reset = useCallback(() => {
    setOfferState({ status: 'idle' })
  }, [])

  return { offerState, submitOffer, reset }
}