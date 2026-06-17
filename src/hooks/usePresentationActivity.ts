import { useCallback, useEffect, useState } from 'react'
import {
  deletePresentationActivity,
  getPresentationActivity,
} from '../api/presentationActivity'
import type {
  PresentationActivityQuery,
  PresentationActivityRecord,
} from '../types/presentationActivity'
import { DEFAULT_PRESENTATION_ACTIVITY_PAGE_SIZE } from '../types/presentationActivity'
import { presentationActivityUserMessage } from '../utils/presentationActivityErrors'

type UsePresentationActivityReturn = {
  items: PresentationActivityRecord[]
  loading: boolean
  loadingMore: boolean
  errorMessage: string | null
  hasMore: boolean
  loadMore: () => void
  removeItem: (id: string) => Promise<void>
  reportError: (message: string) => void
  clearError: () => void
}

function toQuery(page: number): PresentationActivityQuery {
  return {
    page,
    page_size: DEFAULT_PRESENTATION_ACTIVITY_PAGE_SIZE,
  }
}

export function usePresentationActivity(): UsePresentationActivityReturn {
  const [items, setItems] = useState<PresentationActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const hasMore = page * DEFAULT_PRESENTATION_ACTIVITY_PAGE_SIZE < total

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    void (async () => {
      setLoading(true)
      setErrorMessage(null)
      setPage(1)
      try {
        const response = await getPresentationActivity(toQuery(1))
        if (signal.aborted) return
        setItems(response.items)
        setTotal(response.total)
        setPage(response.page)
      } catch {
        if (signal.aborted) return
        setItems([])
        setTotal(0)
        // Initial list load: show empty state only (backend may be unavailable).
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [])

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return
    const nextPage = page + 1
    setLoadingMore(true)
    setErrorMessage(null)

    void (async () => {
      try {
        const response = await getPresentationActivity(toQuery(nextPage))
        setItems((prev) => [...prev, ...response.items])
        setTotal(response.total)
        setPage(response.page)
      } catch (err: unknown) {
        setErrorMessage(presentationActivityUserMessage(err, 'load_more'))
      } finally {
        setLoadingMore(false)
      }
    })()
  }, [hasMore, loading, loadingMore, page])

  const removeItem = useCallback(async (id: string) => {
    await deletePresentationActivity(id)
    setErrorMessage(null)
    setItems((prev) => prev.filter((item) => item.id !== id))
    setTotal((prev) => Math.max(0, prev - 1))
  }, [])

  const reportError = useCallback((message: string) => setErrorMessage(message), [])

  const clearError = useCallback(() => setErrorMessage(null), [])

  return {
    items,
    loading,
    loadingMore,
    errorMessage,
    hasMore,
    loadMore,
    removeItem,
    reportError,
    clearError,
  }
}
