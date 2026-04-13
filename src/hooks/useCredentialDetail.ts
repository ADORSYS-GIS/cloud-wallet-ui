import { useEffect, useState } from 'react'
import { getCredentialById } from '../api/credentials'
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
    let cancelled = false

    getCredentialById(id)
      .then((data) => {
        if (!cancelled) {
          setState({ credential: data, loading: false, error: null })
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            credential: null,
            loading: false,
            error: err instanceof Error ? err : new Error('Failed to load credential'),
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [id])

  return state
}
