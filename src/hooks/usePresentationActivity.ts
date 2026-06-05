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

export type PresentationActivityFilters = {
  from: string
  to: string
  verifierName: string
}

export const EMPTY_PRESENTATION_ACTIVITY_FILTERS: PresentationActivityFilters = {
  from: '',
  to: '',
  verifierName: '',
}

type UsePresentationActivityReturn = {
  items: PresentationActivityRecord[]
  loading: boolean
  loadingMore: boolean
  errorMessage: string | null
  hasMore: boolean
  filters: PresentationActivityFilters
  setFilters: (next: PresentationActivityFilters) => void
  loadMore: () => void
  removeItem: (id: string) => Promise<void>
  reportError: (message: string) => void
  clearError: () => void
}

function toQuery(
  filters: PresentationActivityFilters,
  page: number
): PresentationActivityQuery {
  return {
    page,
    page_size: DEFAULT_PRESENTATION_ACTIVITY_PAGE_SIZE,
    from: filters.from || undefined,
    to: filters.to || undefined,
    verifier_name: filters.verifierName.trim() || undefined,
  }
}

export function usePresentationActivity(): UsePresentationActivityReturn {
  const [items, setItems] = useState<PresentationActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [filters, setFilters] = useState<PresentationActivityFilters>(
    EMPTY_PRESENTATION_ACTIVITY_FILTERS
  )
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [appliedFilters, setAppliedFilters] = useState(
    EMPTY_PRESENTATION_ACTIVITY_FILTERS
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setAppliedFilters(filters), 350)
    return () => window.clearTimeout(timeoutId)
  }, [filters])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    void (async () => {
      setLoading(true)
      setErrorMessage(null)
      setPage(1)
      try {
        const response = await getPresentationActivity(toQuery(appliedFilters, 1))
        if (signal.aborted) return
        setItems(response.items)
        setTotal(response.total)
        setPage(response.page)
        setHasMore(response.page * response.page_size < response.total)
      } catch (err: unknown) {
        if (signal.aborted) return
        setItems([])
        setHasMore(false)
        setErrorMessage(presentationActivityUserMessage(err, 'list'))
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [appliedFilters])

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return
    const nextPage = page + 1
    setLoadingMore(true)
    setErrorMessage(null)

    void (async () => {
      try {
        const response = await getPresentationActivity(toQuery(appliedFilters, nextPage))
        setItems((prev) => [...prev, ...response.items])
        setTotal(response.total)
        setPage(response.page)
        setHasMore(response.page * response.page_size < response.total)
      } catch (err: unknown) {
        setErrorMessage(presentationActivityUserMessage(err, 'load_more'))
      } finally {
        setLoadingMore(false)
      }
    })()
  }, [appliedFilters, hasMore, loading, loadingMore, page])

  const removeItem = useCallback(
    async (id: string) => {
      await deletePresentationActivity(id)
      setItems((prev) => prev.filter((item) => item.id !== id))
      setTotal((prev) => Math.max(0, prev - 1))
      setHasMore(page * DEFAULT_PRESENTATION_ACTIVITY_PAGE_SIZE < total - 1)
    },
    [page, total]
  )

  const reportError = useCallback((message: string) => setErrorMessage(message), [])

  const clearError = useCallback(() => setErrorMessage(null), [])

  return {
    items,
    loading,
    loadingMore,
    errorMessage,
    hasMore,
    filters,
    setFilters,
    loadMore,
    removeItem,
    reportError,
    clearError,
  }
}
