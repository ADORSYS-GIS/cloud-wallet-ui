import { useEffect, useState } from 'react'
import { getCredentials } from '../api/credentials'
import type { CredentialSummary } from '../types/credential'

type CredentialsState = {
  items: CredentialSummary[]
  loading: boolean
}

export function useCredentials(): CredentialsState {
  const [items, setItems] = useState<CredentialSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    getCredentials()
      .then((res) => {
        if (!cancelled) {
          setItems(res.items)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([])
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

  return { items, loading }
}
