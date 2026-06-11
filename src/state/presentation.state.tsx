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
  DisclosedClaimMap,
  MatchingCredential,
  ParsedPresentationRequest,
  PersistedPresentationState,
  PresentationError,
  PresentationResult,
  PresentationStatus,
  SelectedCredential,
  VerifierMetadata,
} from '../types/presentation'

const STORAGE_KEY = 'cloud_wallet_presentation_flow'

const IDLE_STATE: PersistedPresentationState = { status: 'idle' }

const DEFAULT_SUBMISSION_FAILED_ERROR: PresentationError = {
  code: 'submission_failed',
  message: 'Presentation submission failed.',
}

function isTerminalStatus(status: PresentationStatus): boolean {
  return status === 'success' || status === 'rejected' || status === 'error'
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
    value === 'rejected' ||
    value === 'error'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isVerifierMetadata(value: unknown): value is VerifierMetadata {
  return isRecord(value) && typeof value.client_id === 'string'
}

function isDcqlQuery(value: unknown): value is ParsedPresentationRequest['dcql_query'] {
  return (
    isRecord(value) && Array.isArray(value.credentials) && value.credentials.length > 0
  )
}

function isParsedPresentationRequest(value: unknown): value is ParsedPresentationRequest {
  if (!isRecord(value)) return false
  const hasScope = typeof value.scope === 'string'
  const hasDcql = isDcqlQuery(value.dcql_query)
  return (
    typeof value.client_id === 'string' &&
    typeof value.nonce === 'string' &&
    typeof value.response_type === 'string' &&
    typeof value.response_mode === 'string' &&
    (hasScope || hasDcql) &&
    !(hasScope && hasDcql)
  )
}

function isMatchingCredential(value: unknown): value is MatchingCredential {
  return (
    isRecord(value) &&
    typeof value.credentialId === 'string' &&
    typeof value.queryId === 'string' &&
    typeof value.format === 'string'
  )
}

function isSelectedCredential(value: unknown): value is SelectedCredential {
  return isMatchingCredential(value)
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
  if (record.verifier !== undefined && !isVerifierMetadata(record.verifier)) return null
  if (record.request !== undefined && !isParsedPresentationRequest(record.request))
    return null
  if (record.error !== undefined && !isPresentationError(record.error)) return null
  if (
    record.matchingCredentials !== undefined &&
    (!Array.isArray(record.matchingCredentials) ||
      !record.matchingCredentials.every(isMatchingCredential))
  ) {
    return null
  }
  if (
    record.selectedCredentials !== undefined &&
    (!Array.isArray(record.selectedCredentials) ||
      !record.selectedCredentials.every(isSelectedCredential))
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
  setRequest: (request: ParsedPresentationRequest) => void
  setVerifier: (verifier: VerifierMetadata) => void
  setMatchingCredentials: (credentials: MatchingCredential[]) => void
  setSelectedCredentials: (credentials: SelectedCredential[]) => void
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
   * Updates lifecycle status only. Does not reset request, credentials, or disclosure fields.
   * Call `clear()` when starting a new presentation flow or after the user leaves a result screen.
   */
  const setStatus = useCallback((status: PresentationStatus) => {
    setData((prev) => {
      if (status === 'success' || status === 'rejected') {
        return { ...prev, status, error: undefined }
      }
      return { ...prev, status }
    })
  }, [])

  const setRequest = useCallback((request: ParsedPresentationRequest) => {
    setData((prev) => ({
      ...prev,
      request,
      matchingCredentials: undefined,
      selectedCredentials: undefined,
      disclosedClaims: undefined,
      submissionResult: undefined,
      error: undefined,
    }))
  }, [])

  const setVerifier = useCallback((verifier: VerifierMetadata) => {
    setData((prev) => ({ ...prev, verifier }))
  }, [])

  const setMatchingCredentials = useCallback(
    (matchingCredentials: MatchingCredential[]) => {
      setData((prev) => ({
        ...prev,
        matchingCredentials,
        selectedCredentials: undefined,
        disclosedClaims: undefined,
      }))
    },
    []
  )

  const setSelectedCredentials = useCallback(
    (selectedCredentials: SelectedCredential[]) => {
      setData((prev) => ({ ...prev, selectedCredentials }))
    },
    []
  )

  const setDisclosedClaims = useCallback((disclosedClaims: DisclosedClaimMap) => {
    setData((prev) => ({ ...prev, disclosedClaims }))
  }, [])

  const setSubmissionResult = useCallback(
    (submissionResult: PresentationResult, error?: PresentationError) => {
      const terminalStatus =
        submissionResult.status === 'rejected'
          ? 'rejected'
          : submissionResult.success
            ? 'success'
            : 'error'

      setData((prev) => ({
        ...prev,
        submissionResult,
        status: terminalStatus,
        error:
          terminalStatus === 'error'
            ? (error ?? prev.error ?? DEFAULT_SUBMISSION_FAILED_ERROR)
            : undefined,
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
    data.status !== 'idle' &&
    data.status !== 'success' &&
    data.status !== 'rejected' &&
    data.status !== 'error'

  const value = useMemo<PresentationState>(
    () => ({
      ...data,
      isFlowActive,
      setStatus,
      setRequest,
      setVerifier,
      setMatchingCredentials,
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
      setMatchingCredentials,
      setRequest,
      setSelectedCredentials,
      setStatus,
      setSubmissionResult,
      setVerifier,
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
  CredentialSelection,
  DisclosedClaimMap,
  MatchingCredential,
  ParsedPresentationRequest,
  PresentationConsentAcceptRequest,
  PresentationConsentRejectRequest,
  PresentationConsentRequest,
  PresentationConsentResponse,
  PresentationConsentStatus,
  PresentationError,
  PresentationErrorCode,
  PresentationResult,
  PresentationStatus,
  SelectedCredential,
  VerifierMetadata,
} from '../types/presentation'
