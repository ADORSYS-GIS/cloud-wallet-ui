import { useEffect, useState } from 'react'
import { getApiBaseUrl } from '../utils/env'
import { getBearerToken } from '../auth/authService'
import { validateCredentialRecord } from '../api/validation'
import type { CredentialRecord } from '../types/credential'

type DetailState = {
  credential: CredentialRecord | null
  loading: boolean
  error: Error | null
}

export function useCredentialDetail(id: string): DetailState {
  const [state, setState] = useState<DetailState>({
    credential: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    void (async () => {
      try {
        const token = await getBearerToken()
        if (signal.aborted) return

        const response = await fetch(
          `${getApiBaseUrl()}/credentials/${encodeURIComponent(id)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal,
          }
        )
        if (signal.aborted) return

        if (!response.ok) {
          setState({
            credential: null,
            loading: false,
            error: new Error(`Failed to load credential (HTTP ${response.status})`),
          })
          return
        }

        const raw = (await response.json()) as unknown
        if (signal.aborted) return

        const credential = validateCredentialRecord(raw)
        setState({ credential, loading: false, error: null })
      } catch (err: unknown) {
        if (signal.aborted) return
        setState({
          credential: null,
          loading: false,
          error: err instanceof Error ? err : new Error('Failed to load credential'),
        })
      }
    })()

    return () => {
      controller.abort()
    }
  }, [id])

  return state
}