import { useEffect, useState } from 'react'
import { getApiBaseUrl } from '../utils/env'
import { getBearerToken } from '../auth/authService'
import { validateCredentialListResponse } from '../api/validation'
import type { CredentialRecord } from '../types/credential'

type CredentialsState = {
  credentials: CredentialRecord[]
  loading: boolean
}

export function useCredentials(): CredentialsState {
  const [credentials, setCredentials] = useState<CredentialRecord[]>([])
  const [loading, setLoading] = useState(true)

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
  }, [])

  return { credentials, loading }
}