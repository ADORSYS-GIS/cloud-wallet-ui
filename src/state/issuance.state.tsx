/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'
import type { StartIssuanceResponse } from '../types/issuance'
import type { IssuanceApiError } from '../types/issuance'

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export type CredentialOfferStatus = 'idle' | 'loading' | 'success' | 'error'

type CredentialOfferState = {
  status: CredentialOfferStatus
  /** Populated once the backend confirms the offer (status === 'success'). */
  offer?: StartIssuanceResponse
  /** Populated when the backend returns an error (status === 'error'). */
  error?: IssuanceApiError
  /** Human-readable message derived from the error, suitable for display. */
  errorMessage?: string
  setLoading: () => void
  setOffer: (offer: StartIssuanceResponse) => void
  setError: (error: IssuanceApiError, message: string) => void
  clear: () => void
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const CredentialOfferContext = createContext<CredentialOfferState | null>(null)

export function CredentialOfferProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<CredentialOfferStatus>('idle')
  const [offer, setOfferState] = useState<StartIssuanceResponse | undefined>(undefined)
  const [error, setErrorState] = useState<IssuanceApiError | undefined>(undefined)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)

  const value = useMemo<CredentialOfferState>(
    () => ({
      status,
      offer,
      error,
      errorMessage,
      setLoading: () => {
        setOfferState(undefined)
        setErrorState(undefined)
        setErrorMessage(undefined)
        setStatus('loading')
      },
      setOffer: (next) => {
        setErrorState(undefined)
        setErrorMessage(undefined)
        setOfferState(next)
        setStatus('success')
      },
      setError: (next, message) => {
        setOfferState(undefined)
        setErrorState(next)
        setErrorMessage(message)
        setStatus('error')
      },
      clear: () => {
        setOfferState(undefined)
        setErrorState(undefined)
        setErrorMessage(undefined)
        setStatus('idle')
      },
    }),
    [error, errorMessage, offer, status]
  )

  return (
    <CredentialOfferContext.Provider value={value}>
      {children}
    </CredentialOfferContext.Provider>
  )
}

export function useCredentialOfferState(): CredentialOfferState {
  const ctx = useContext(CredentialOfferContext)
  if (!ctx) {
    throw new Error('useCredentialOfferState must be used within CredentialOfferProvider')
  }
  return ctx
}
