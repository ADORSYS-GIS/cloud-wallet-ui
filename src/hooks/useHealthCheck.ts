import { useEffect, useState } from 'react'
import { getHealth } from '../api/health'
import type { HealthResponse } from '../types/api'

type HealthState = {
  data: HealthResponse | null
  loading: boolean
  error: string | null
}

export function useHealthCheck() {
  const [state, setState] = useState<HealthState>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let mounted = true

    getHealth()
      .then((data) => {
        if (!mounted) {
          return
        }

        setState({
          data,
          loading: false,
          error: null,
        })
      })
      .catch((error: Error) => {
        if (!mounted) {
          return
        }

        setState({
          data: null,
          loading: false,
          error: error.message,
        })
      })

    return () => {
      mounted = false
    }
  }, [])

  return state
}
