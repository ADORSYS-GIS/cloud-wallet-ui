/** Verifier metadata shown on presentation activity records (no claim values). */
export type PresentationActivityVerifier = {
  client_id: string
  name?: string | null
  logo_uri?: string | null
}

/**
 * Audit record for a completed presentation.
 * Only metadata is stored — never individual claim values.
 */
export type PresentationActivityRecord = {
  id: string
  presented_at: string
  verifier: PresentationActivityVerifier
  credential_types: string[]
  disclosed_claim_count: number
}

export type PresentationActivityListResponse = {
  items: PresentationActivityRecord[]
  total: number
  page: number
  page_size: number
}

export type PresentationActivityQuery = {
  page?: number
  page_size?: number
  /** Inclusive start date (YYYY-MM-DD). */
  from?: string
  /** Inclusive end date (YYYY-MM-DD). */
  to?: string
  /** Case-insensitive substring match on verifier display name. */
  verifier_name?: string
}

export const DEFAULT_PRESENTATION_ACTIVITY_PAGE_SIZE = 20
