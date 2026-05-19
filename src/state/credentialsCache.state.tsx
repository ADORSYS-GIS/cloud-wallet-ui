/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { CredentialListItem } from '../types/credential'

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

const CredentialsCacheContext = createContext<CredentialsCacheState | null>(null)

export function CredentialsCacheProvider({ children }: { children: React.ReactNode }) {
  const [credentials, setCredentialsMap] = useState<Map<string, CredentialListItem>>(
    new Map()
  )

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
