import { apiGet } from './client'
import type { CredentialListResponse, CredentialRecord } from '../types/credential'
import { validateCredentialListResponse, validateCredentialRecord } from './validation'

/**
 * Fetch all credentials for the authenticated tenant.
 *
 * Spec: GET /credentials
 * Response: CredentialListResponse (200) → { credentials: CredentialRecord[] }
 *
 * The response is validated against the OpenAPI contract before being returned.
 */
export async function getCredentials(): Promise<CredentialListResponse> {
  const raw = await apiGet<unknown>('/credentials')
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
