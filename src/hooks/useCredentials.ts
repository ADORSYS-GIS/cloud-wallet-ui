import { useEffect, useState } from 'react'
import { getApiBaseUrl } from '../utils/env'
import { getBearerToken } from '../auth/authService'
import { validateCredentialListResponse } from '../api/validation'
import { useCredentialsCache } from '../state/credentialsCache.state'
import type { CredentialListItem } from '../types/credential'

type CredentialsState = {
  credentials: CredentialListItem[]
  loading: boolean
}

export function useCredentials(): CredentialsState {
  const [credentials, setCredentials] = useState<CredentialListItem[]>([])
  const [loading, setLoading] = useState(true)
  const { setCredentials: cacheCredentials } = useCredentialsCache()

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    void (async () => {
      try {
        const token = await getBearerToken()
        if (signal.aborted) return

        const response = await fetch(`${getApiBaseUrl()}/credentials`, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        })
        if (signal.aborted) return

        if (!response.ok) {
          setCredentials([])
          setLoading(false)
          return
        }

        const raw = (await response.json()) as unknown
        if (signal.aborted) return

        const data = validateCredentialListResponse(raw)
        setCredentials(data.credentials)
        // Cache credentials with display metadata for reuse on detail page
        cacheCredentials(data.credentials)
      } catch {
        if (signal.aborted) return
        setCredentials([])
      } finally {
        if (!signal.aborted) {
          setLoading(false)
        }
      }
    })()

    return () => {
      controller.abort()
    }
  }, [cacheCredentials])

  return { credentials, loading }
}
