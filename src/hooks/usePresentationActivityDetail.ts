import { useCallback, useEffect, useState } from 'react'
import {
  deletePresentationActivity,
  getPresentationActivityById,
} from '../api/presentationActivity'
import type { PresentationActivityRecord } from '../types/presentationActivity'
import { presentationActivityUserMessage } from '../utils/presentationActivityErrors'

type UsePresentationActivityDetailReturn = {
  record: PresentationActivityRecord | null
  loading: boolean
  errorMessage: string | null
  deleting: boolean
  forget: () => Promise<void>
  clearError: () => void
}

export function usePresentationActivityDetail(
  activityId: string | undefined
): UsePresentationActivityDetailReturn {
  const [record, setRecord] = useState<PresentationActivityRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    void (async () => {
      if (!activityId) {
        setRecord(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setErrorMessage(null)
      try {
        const data = await getPresentationActivityById(activityId)
        if (signal.aborted) return
        setRecord(data)
      } catch (err: unknown) {
        if (signal.aborted) return
        setRecord(null)
        setErrorMessage(presentationActivityUserMessage(err, 'detail'))
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    })()

    return () => {
      controller.abort()
    }
  }, [activityId])

  const forget = useCallback(async () => {
    if (!activityId) return
    setDeleting(true)
    setErrorMessage(null)
    try {
      await deletePresentationActivity(activityId)
    } catch (err: unknown) {
      setErrorMessage(presentationActivityUserMessage(err, 'delete'))
      setDeleting(false)
      throw err
    }
    setDeleting(false)
  }, [activityId])

  const clearError = useCallback(() => setErrorMessage(null), [])

  return {
    record,
    loading,
    errorMessage,
    deleting,
    forget,
    clearError,
  }
}
