import { useEffect, useState } from 'react'
import { getCredentials } from '../api/credentials'
import type { CredentialRecord } from '../types/credential'

type CredentialsState = {
  credentials: CredentialRecord[]
  loading: boolean
}

export function useCredentials(): CredentialsState {
  const [credentials, setCredentials] = useState<CredentialRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    getCredentials()
      .then((res) => {
        if (!cancelled) {
          setCredentials(res.credentials)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCredentials([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { credentials, loading }
}
