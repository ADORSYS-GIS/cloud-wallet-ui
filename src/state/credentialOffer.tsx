/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'
import type { CredentialOfferResolutionResponse } from '../types/credentialOffer'

export type CredentialOfferErrorKind =
  | 'invalid_offer'
  | 'expired_pre_auth_code'
  | 'network'
  | 'server'
  | 'unknown'

export type CredentialOfferUiError = {
  kind: CredentialOfferErrorKind
  code?: string
  message: string
  retryable: boolean
}

export type CredentialOfferStatus = 'idle' | 'loading' | 'success' | 'error'

type CredentialOfferState = {
  status: CredentialOfferStatus
  offer?: CredentialOfferResolutionResponse
  error?: CredentialOfferUiError
  setLoading: () => void
  setOffer: (offer: CredentialOfferResolutionResponse) => void
  setError: (error: CredentialOfferUiError) => void
  clear: () => void
}

const CredentialOfferContext = createContext<CredentialOfferState | null>(null)

export function CredentialOfferProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<CredentialOfferStatus>('idle')
  const [offer, setOfferState] = useState<CredentialOfferResolutionResponse | undefined>(
    undefined
  )
  const [error, setErrorState] = useState<CredentialOfferUiError | undefined>(undefined)

  const value = useMemo<CredentialOfferState>(
    () => ({
      status,
      offer,
      error,
      setLoading: () => {
        setOfferState(undefined)
        setErrorState(undefined)
        setStatus('loading')
      },
      setOffer: (next) => {
        setErrorState(undefined)
        setOfferState(next)
        setStatus('success')
      },
      setError: (next) => {
        setOfferState(undefined)
        setErrorState(next)
        setStatus('error')
      },
      clear: () => {
        setOfferState(undefined)
        setErrorState(undefined)
        setStatus('idle')
      },
    }),
    [error, offer, status]
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
