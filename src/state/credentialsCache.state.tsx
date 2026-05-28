/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { CredentialListItem } from '../types/credential'

const STORAGE_KEY = 'cloud_wallet_credentials_cache'

export type CredentialsCacheState = {
  /** Cached credentials from the list endpoint with display metadata */
  credentials: Map<string, CredentialListItem>
  /** Get a cached credential by ID */
  getCredential: (id: string) => CredentialListItem | undefined
  /** Update the cache with new credentials */
  setCredentials: (credentials: CredentialListItem[]) => void
  /** Clear the cache */
  clear: () => void
}

/**
 * Serialize credentials to localStorage-compatible format
 */
function serializeCredentials(credentials: Map<string, CredentialListItem>): string {
  const entries = Array.from(credentials.entries())
  return JSON.stringify(entries)
}

/**
 * Deserialize credentials from localStorage
 */
function deserializeCredentials(data: string): Map<string, CredentialListItem> {
  try {
    const entries = JSON.parse(data) as [string, CredentialListItem][]
    return new Map(entries)
  } catch {
    return new Map()
  }
}

/**
 * Load credentials from localStorage
 */
function loadFromStorage(): Map<string, CredentialListItem> {
  if (typeof window === 'undefined') {
    return new Map()
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return deserializeCredentials(stored)
    }
  } catch {
    // Ignore storage errors (e.g., private browsing mode)
  }
  return new Map()
}

/**
 * Save credentials to localStorage
 */
function saveToStorage(credentials: Map<string, CredentialListItem>): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    localStorage.setItem(STORAGE_KEY, serializeCredentials(credentials))
  } catch {
    // Ignore storage errors (e.g., quota exceeded, private browsing mode)
  }
}

const CredentialsCacheContext = createContext<CredentialsCacheState | null>(null)

export function CredentialsCacheProvider({ children }: { children: React.ReactNode }) {
  const [credentials, setCredentialsMap] = useState<Map<string, CredentialListItem>>(
    () => loadFromStorage()
  )

  // Persist to localStorage whenever credentials change
  useEffect(() => {
    saveToStorage(credentials)
  }, [credentials])

  const getCredential = useCallback(
    (id: string): CredentialListItem | undefined => {
      return credentials.get(id)
    },
    [credentials]
  )

  const setCredentials = useCallback((newCredentials: CredentialListItem[]) => {
    setCredentialsMap((prev) => {
      const next = new Map(prev)
      for (const cred of newCredentials) {
        next.set(cred.id, cred)
      }
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setCredentialsMap(new Map())
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // Ignore storage errors
      }
    }
  }, [])

  const value = useMemo<CredentialsCacheState>(
    () => ({
      credentials,
      getCredential,
      setCredentials,
      clear,
    }),
    [credentials, getCredential, setCredentials, clear]
  )

  return (
    <CredentialsCacheContext.Provider value={value}>
      {children}
    </CredentialsCacheContext.Provider>
  )
}

export function useCredentialsCache(): CredentialsCacheState {
  const ctx = useContext(CredentialsCacheContext)
  if (!ctx) {
    throw new Error('useCredentialsCache must be used within CredentialsCacheProvider')
  }
  return ctx
}
