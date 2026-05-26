import { useEffect, useState } from 'react'
import { getApiBaseUrl } from '../utils/env'
import { getBearerToken } from '../auth/authService'

/**
 * Raw credential data from the backend.
 * The backend returns the parsed credential claims directly as a JSON object.
 */
export type RawCredentialData = Record<string, unknown>

type DetailState = {
  credential: RawCredentialData | null
  loading: boolean
  error: Error | null
}

/**
 * Fetch raw credential data for a given credential ID.
 *
 * The backend returns the parsed credential claims directly as a JSON object,
 * without the CredentialRecord wrapper structure. This hook returns the raw
 * claims data for direct rendering in the UI.
 */
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

        const raw = (await response.json()) as RawCredentialData
        if (signal.aborted) return

        // Validate that we received an object (not null, array, or primitive)
        if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
          setState({
            credential: null,
            loading: false,
            error: new Error('Invalid credential data: expected an object'),
          })
          return
        }

        setState({ credential: raw, loading: false, error: null })
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
