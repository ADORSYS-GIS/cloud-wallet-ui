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

function parsePersistedState(raw: string): PersistedPresentationState | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const record = parsed as Record<string, unknown>
    if (!isPresentationStatus(record.status)) return null
    if (!isPersistableStatus(record.status)) return null
    return parsed as PersistedPresentationState
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
  setSubmissionResult: (result: PresentationResult) => void
  setError: (error: PresentationError) => void
  /** Reset all presentation state and remove persisted data. */
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

  const setStatus = useCallback((status: PresentationStatus) => {
    setData((prev) => {
      if (status === 'success') {
        return { ...prev, status: 'success', error: undefined }
      }
      return { ...prev, status }
    })
  }, [])

  const setRequest = useCallback((request: ParsedPresentationRequest) => {
    setData((prev) => ({ ...prev, request }))
  }, [])

  const setVerifier = useCallback((verifier: VerifierMetadata) => {
    setData((prev) => ({ ...prev, verifier }))
  }, [])

  const setMatchingCredentials = useCallback(
    (matchingCredentials: MatchingCredential[]) => {
      setData((prev) => ({ ...prev, matchingCredentials }))
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

  const setSubmissionResult = useCallback((submissionResult: PresentationResult) => {
    setData((prev) => ({
      ...prev,
      submissionResult,
      status: submissionResult.success ? 'success' : 'error',
      error: submissionResult.success ? undefined : prev.error,
    }))
  }, [])

  const setError = useCallback((error: PresentationError) => {
    setData((prev) => ({
      ...prev,
      error,
      status: 'error',
      submissionResult: undefined,
    }))
  }, [])

  const clear = useCallback(() => {
    setData(IDLE_STATE)
    removeFromStorage()
  }, [])

  useEffect(() => {
    if (!isTerminalStatus(data.status)) return
    clear()
  }, [clear, data.status])

  const isFlowActive =
    data.status !== 'idle' && data.status !== 'success' && data.status !== 'error'

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
