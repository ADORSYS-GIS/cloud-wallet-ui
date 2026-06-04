import { apiDelete, apiGet } from './client'
import {
  validatePresentationActivityListResponse,
  validatePresentationActivityRecord,
} from './presentationActivityValidation'
import type {
  PresentationActivityListResponse,
  PresentationActivityQuery,
  PresentationActivityRecord,
} from '../types/presentationActivity'
import { DEFAULT_PRESENTATION_ACTIVITY_PAGE_SIZE } from '../types/presentationActivity'
import {
  filterWithinRetentionWindow,
  isPresentationActivityId,
  sortPresentationActivityNewestFirst,
} from '../utils/presentationActivity'

/**
 * Build query string for GET /presentation/activity.
 *
 * Spec (issue #93): paginated list with optional date range and verifier name search.
 * Backend applies auto-expiry (default 30 days); the UI also filters defensively.
 */
function buildActivityQueryString(query: PresentationActivityQuery): string {
  const params = new URLSearchParams()
  const page = query.page ?? 1
  const pageSize = query.page_size ?? DEFAULT_PRESENTATION_ACTIVITY_PAGE_SIZE

  params.set('page', String(page))
  params.set('page_size', String(pageSize))

  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  const verifierName = query.verifier_name?.trim()
  if (verifierName) params.set('verifier_name', verifierName)

  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

function normalizeListResponse(
  response: PresentationActivityListResponse
): PresentationActivityListResponse {
  const items = sortPresentationActivityNewestFirst(
    filterWithinRetentionWindow(response.items)
  )
  return { ...response, items }
}

/**
 * Fetch presentation activity records (newest first).
 *
 * Spec: GET /presentation/activity
 */
export async function getPresentationActivity(
  query: PresentationActivityQuery = {}
): Promise<PresentationActivityListResponse> {
  const qs = buildActivityQueryString(query)
  const raw = await apiGet<unknown>(`/presentation/activity${qs}`)
  return normalizeListResponse(validatePresentationActivityListResponse(raw))
}

/**
 * Fetch a single presentation activity record by id.
 *
 * Spec: GET /presentation/activity/{id}
 */
export async function getPresentationActivityById(
  id: string
): Promise<PresentationActivityRecord> {
  if (!isPresentationActivityId(id)) {
    throw new Error('Invalid presentation activity id')
  }
  const raw = await apiGet<unknown>(`/presentation/activity/${encodeURIComponent(id)}`)
  return validatePresentationActivityRecord(raw)
}

/**
 * Permanently delete a presentation activity record (privacy / forget).
 *
 * Spec: DELETE /presentation/activity/{id}
 */
export async function deletePresentationActivity(id: string): Promise<void> {
  if (!isPresentationActivityId(id)) {
    throw new Error('Invalid presentation activity id')
  }
  await apiDelete(`/presentation/activity/${encodeURIComponent(id)}`)
}
