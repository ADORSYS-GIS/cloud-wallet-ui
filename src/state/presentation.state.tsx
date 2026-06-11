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
  DisclosedClaimMap,
  PersistedPresentationState,
  PresentationError,
  PresentationFlow,
  PresentationResult,
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

/** Only in-progress flow states are persisted (survives external redirects). */
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

function isPresentationFlow(value: unknown): value is PresentationFlow {
  return value === 'cross_device' || value === 'same_device'
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

function isDisclosedClaimMap(value: unknown): value is DisclosedClaimMap {
  if (!isRecord(value)) return false
  return Object.values(value).every(
    (claims) =>
      Array.isArray(claims) && claims.every((claim) => typeof claim === 'string')
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
  if (record.session_id !== undefined && typeof record.session_id !== 'string')
    return null
  if (record.expires_at !== undefined && typeof record.expires_at !== 'string')
    return null
  if (record.flow !== undefined && !isPresentationFlow(record.flow)) return null
  if (record.verifier !== undefined && !isVerifierDisplay(record.verifier)) return null
  if (record.error !== undefined && !isPresentationError(record.error)) return null
  if (
    record.credential_matches !== undefined &&
    (!Array.isArray(record.credential_matches) ||
      !record.credential_matches.every(isCredentialMatch))
  ) {
    return null
  }
  if (
    record.selected_credentials !== undefined &&
    (!Array.isArray(record.selected_credentials) ||
      !record.selected_credentials.every(isCredentialSelection))
  ) {
    return null
  }
  if (
    record.disclosedClaims !== undefined &&
    !isDisclosedClaimMap(record.disclosedClaims)
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
  /** True while the flow is in progress (not idle, success, or error). */
  isFlowActive: boolean
  setStatus: (status: PresentationStatus) => void
  setStartResponse: (response: StartPresentationResponse) => void
  setSelectedCredentials: (credentials: CredentialSelection[]) => void
  setDisclosedClaims: (claims: DisclosedClaimMap) => void
  /**
   * Sets submission outcome and terminal status. On failure, uses `error` when provided,
   * otherwise keeps an existing error or falls back to `submission_failed`.
   */
  setSubmissionResult: (result: PresentationResult, error?: PresentationError) => void
  setError: (error: PresentationError) => void
  /** Reset all presentation state and remove persisted data. */
  clear: () => void
}

const PresentationContext = createContext<PresentationState | null>(null)

/** In-progress flow state is persisted; terminal success/error stays in memory until `clear()`. */
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

  /**
   * Updates lifecycle status only. Does not reset session, credentials, or disclosure fields.
   * Call `clear()` when starting a new presentation flow or after the user leaves a result screen.
   */
  const setStatus = useCallback((status: PresentationStatus) => {
    setData((prev) => {
      if (status === 'success') {
        return { ...prev, status: 'success', error: undefined }
      }
      return { ...prev, status }
    })
  }, [])

  const setStartResponse = useCallback((response: StartPresentationResponse) => {
    setData((prev) => ({
      ...prev,
      session_id: response.session_id,
      expires_at: response.expires_at,
      flow: response.flow,
      verifier: response.verifier,
      purpose: response.purpose ?? null,
      credential_matches: response.credential_matches,
      credential_set_options: response.credential_set_options ?? null,
      transaction_data: response.transaction_data ?? null,
      requires_consent: response.requires_consent,
      selected_credentials: undefined,
      disclosedClaims: undefined,
      submissionResult: undefined,
      error: undefined,
    }))
  }, [])

  const setSelectedCredentials = useCallback(
    (selected_credentials: CredentialSelection[]) => {
      setData((prev) => ({ ...prev, selected_credentials }))
    },
    []
  )

  const setDisclosedClaims = useCallback((disclosedClaims: DisclosedClaimMap) => {
    setData((prev) => ({ ...prev, disclosedClaims }))
  }, [])

  const setSubmissionResult = useCallback(
    (submissionResult: PresentationResult, error?: PresentationError) => {
      setData((prev) => ({
        ...prev,
        submissionResult,
        status: submissionResult.success ? 'success' : 'error',
        error: submissionResult.success
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
      submissionResult: undefined,
    }))
  }, [])

  const isFlowActive =
    data.status !== 'idle' && data.status !== 'success' && data.status !== 'error'

  const value = useMemo<PresentationState>(
    () => ({
      ...data,
      isFlowActive,
      setStatus,
      setStartResponse,
      setSelectedCredentials,
      setDisclosedClaims,
      setSubmissionResult,
      setError,
      clear,
    }),
    [
      clear,
      data,
      isFlowActive,
      setDisclosedClaims,
      setError,
      setSelectedCredentials,
      setStartResponse,
      setStatus,
      setSubmissionResult,
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
  DisclosedClaimMap,
  PresentationError,
  PresentationErrorCode,
  PresentationResult,
  PresentationStatus,
  SelectedCredential,
  VerifierDisplay,
} from '../types/presentation'
