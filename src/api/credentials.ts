import { apiGet } from './client'
import type {
  CredentialListResponse,
  CredentialRecord,
  CredentialStatus,
  CredentialFormat,
} from '../types/credential'
import { validateCredentialListResponse, validateCredentialRecord } from './validation'

/**
 * Optional query-parameter filters for `getCredentials()`.
 *
 * All fields are optional. Omitted or `undefined` fields produce no query
 * parameter. Empty arrays are treated as omitted.
 *
 * Spec: GET /credentials (openapi/openapi.yaml lines 611-659)
 *
 * @example
 * // Only active PID credentials from a specific issuer
 * getCredentials({
 *   status: 'active',
 *   credential_types: ['eu.europa.ec.eudi.pid.1'],
 *   issuer: 'https://issuer.example.eu',
 * })
 */
export type CredentialFilters = {
  /**
   * Filter by one or more credential configuration IDs.
   * Repeated as individual `credential_types` query params per the spec.
   */
  credential_types?: string[]
  /** Filter by credential validity status. */
  status?: CredentialStatus
  /** Filter by credential format. */
  format?: CredentialFormat
  /** Filter by issuer identifier URI. */
  issuer?: string
}

/**
 * Build a query string from the supplied filters.
 * Returns an empty string when no filters are active.
 */
function buildQueryString(filters: CredentialFilters): string {
  const params = new URLSearchParams()

  if (filters.credential_types && filters.credential_types.length > 0) {
    for (const type of filters.credential_types) {
      params.append('credential_types', type)
    }
  }

  if (filters.status !== undefined) {
    params.set('status', filters.status)
  }

  if (filters.format !== undefined) {
    params.set('format', filters.format)
  }

  if (filters.issuer !== undefined) {
    params.set('issuer', filters.issuer)
  }

  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

/**
 * Fetch all credentials for the authenticated tenant.
 *
 * Spec: GET /credentials
 * Response: CredentialListResponse (200) → { credentials: CredentialRecord[] }
 *
 * @param filters - Optional query-parameter filters. All fields are optional;
 *                  omitting the argument (or passing `{}`) fetches all
 *                  credentials without filtering.
 *
 * The response is validated against the OpenAPI contract before being returned.
 */
export async function getCredentials(
  filters: CredentialFilters = {}
): Promise<CredentialListResponse> {
  const qs = buildQueryString(filters)
  const raw = await apiGet<unknown>(`/credentials${qs}`)
  return validateCredentialListResponse(raw)
}

/**
 * Fetch a single credential by its internal wallet UUID.
 *
 * Spec: GET /credentials/{id}
 * Response: CredentialRecord (200)
 *
 * The response is validated against the OpenAPI contract before being returned.
 */
export async function getCredentialById(id: string): Promise<CredentialRecord> {
  const raw = await apiGet<unknown>(`/credentials/${encodeURIComponent(id)}`)
  return validateCredentialRecord(raw)
}
