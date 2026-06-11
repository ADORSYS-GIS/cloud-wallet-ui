/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type {
  CredentialMatch,
  CredentialSelection,
  PersistedPresentationState,
  PresentationConsentResponse,
  PresentationError,
  PresentationStatus,
  StartPresentationResponse,
  VerifierDisplay,
} from '../types/presentation'

const STORAGE_KEY = 'cloud_wallet_presentation_flow'

const IDLE_STATE: PersistedPresentationState = { status: 'idle' }

const DEFAULT_SUBMISSION_FAILED_ERROR: PresentationError = {
  code: 'submission_failed',
  message: 'Presentation submission failed.',
}

function isTerminalStatus(status: PresentationStatus): boolean {
  return status === 'success' || status === 'error'
}

function isPersistableStatus(status: PresentationStatus): boolean {
  return status !== 'idle' && !isTerminalStatus(status)
}

function isPresentationStatus(value: unknown): value is PresentationStatus {
  return (
    value === 'idle' ||
    value === 'loading' ||
    value === 'parsing' ||
    value === 'verifying' ||
    value === 'selecting' ||
    value === 'reviewing' ||
    value === 'consenting' ||
    value === 'submitting' ||
    value === 'success' ||
    value === 'error'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isVerifierDisplay(value: unknown): value is VerifierDisplay {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.verified === 'boolean'
  )
}

function isCredentialMatch(value: unknown): value is CredentialMatch {
  return (
    isRecord(value) &&
    typeof value.query_id === 'string' &&
    typeof value.required === 'boolean' &&
    Array.isArray(value.candidates)
  )
}

function isCredentialSelection(value: unknown): value is CredentialSelection {
  return (
    isRecord(value) &&
    typeof value.query_id === 'string' &&
    typeof value.credential_id === 'string'
  )
}

function isPresentationError(value: unknown): value is PresentationError {
  return (
    isRecord(value) && typeof value.code === 'string' && typeof value.message === 'string'
  )
}

function validatePersistedFields(
  record: Record<string, unknown>
): PersistedPresentationState | null {
  if (record.verifier !== undefined && !isVerifierDisplay(record.verifier)) return null
  if (record.error !== undefined && !isPresentationError(record.error)) return null
  if (
    record.credentialMatches !== undefined &&
    (!Array.isArray(record.credentialMatches) ||
      !record.credentialMatches.every(isCredentialMatch))
  ) {
    return null
  }
  if (
    record.selectedCredentials !== undefined &&
    (!Array.isArray(record.selectedCredentials) ||
      !record.selectedCredentials.every(isCredentialSelection))
  ) {
    return null
  }
  return record as PersistedPresentationState
}

function parsePersistedState(raw: string): PersistedPresentationState | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    if (!isPresentationStatus(parsed.status)) return null
    if (!isPersistableStatus(parsed.status)) return null
    return validatePersistedFields(parsed)
  } catch {
    return null
  }
}

function loadFromStorage(): PersistedPresentationState {
  if (typeof window === 'undefined') {
    return IDLE_STATE
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const recovered = parsePersistedState(stored)
      if (recovered) return recovered
    }
  } catch {
    // Ignore storage errors (e.g., private browsing mode)
  }
  return IDLE_STATE
}

function saveToStorage(state: PersistedPresentationState): void {
  if (typeof window === 'undefined' || !isPersistableStatus(state.status)) {
    return
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
}

function removeFromStorage(): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage errors
  }
}

export type PresentationState = PersistedPresentationState & {
  isFlowActive: boolean
  setStatus: (status: PresentationStatus) => void
  setSession: (response: StartPresentationResponse, authorizationClientId: string) => void
  setSelectedCredentials: (credentials: CredentialSelection[]) => void
  setConsentResponse: (
    response: PresentationConsentResponse,
    error?: PresentationError
  ) => void
  setError: (error: PresentationError) => void
  clear: () => void
}

const PresentationContext = createContext<PresentationState | null>(null)

export function PresentationProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PersistedPresentationState>(loadFromStorage)

  useEffect(() => {
    if (!isPersistableStatus(data.status)) {
      removeFromStorage()
      return
    }
    saveToStorage(data)
  }, [data])

  const clear = useCallback(() => {
    setData(IDLE_STATE)
    removeFromStorage()
  }, [])

  const setStatus = useCallback((status: PresentationStatus) => {
    setData((prev) => {
      if (status === 'success') {
        return { ...prev, status: 'success', error: undefined }
      }
      return { ...prev, status }
    })
  }, [])

  const setSession = useCallback(
    (response: StartPresentationResponse, authorizationClientId: string) => {
      setData({
        status: 'selecting',
        sessionId: response.session_id,
        expiresAt: response.expires_at,
        flow: response.flow,
        purpose: response.purpose ?? null,
        verifier: response.verifier,
        authorizationClientId,
        credentialMatches: response.credential_matches,
        credentialSetOptions: response.credential_set_options ?? null,
        transactionData: response.transaction_data ?? null,
        selectedCredentials: undefined,
        consentResponse: undefined,
        error: undefined,
      })
    },
    []
  )

  const setSelectedCredentials = useCallback(
    (selectedCredentials: CredentialSelection[]) => {
      setData((prev) => ({ ...prev, selectedCredentials }))
    },
    []
  )

  const setConsentResponse = useCallback(
    (consentResponse: PresentationConsentResponse, error?: PresentationError) => {
      setData((prev) => ({
        ...prev,
        consentResponse,
        status: consentResponse.status === 'completed' ? 'success' : 'error',
        error:
          consentResponse.status === 'completed'
            ? undefined
            : (error ?? prev.error ?? DEFAULT_SUBMISSION_FAILED_ERROR),
      }))
    },
    []
  )

  const setError = useCallback((error: PresentationError) => {
    setData((prev) => ({
      ...prev,
      error,
      status: 'error',
      consentResponse: undefined,
    }))
  }, [])

  const isFlowActive =
    data.status !== 'idle' && data.status !== 'success' && data.status !== 'error'

  const value = useMemo<PresentationState>(
    () => ({
      ...data,
      isFlowActive,
      setStatus,
      setSession,
      setSelectedCredentials,
      setConsentResponse,
      setError,
      clear,
    }),
    [
      clear,
      data,
      isFlowActive,
      setConsentResponse,
      setError,
      setSelectedCredentials,
      setSession,
      setStatus,
    ]
  )

  return (
    <PresentationContext.Provider value={value}>{children}</PresentationContext.Provider>
  )
}

export function usePresentationState(): PresentationState {
  const ctx = useContext(PresentationContext)
  if (!ctx) {
    throw new Error('usePresentationState must be used within PresentationProvider')
  }
  return ctx
}

export type {
  CredentialMatch,
  CredentialSelection,
  PresentationConsentResponse,
  PresentationError,
  PresentationErrorCode,
  PresentationFlow,
  PresentationStatus,
  StartPresentationResponse,
  VerifierDisplay,
} from '../types/presentation'
