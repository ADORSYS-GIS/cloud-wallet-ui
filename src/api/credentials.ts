import { apiGet } from './client'
import type { CredentialListResponse, CredentialRecord } from '../types/credential'

/**
 * Fetch all credentials for the authenticated tenant.
 *
 * Spec: GET /credentials
 * Response: CredentialListResponse  →  { credentials: CredentialRecord[] }
 */
export async function getCredentials(): Promise<CredentialListResponse> {
  return apiGet<CredentialListResponse>('/credentials')
}

/**
 * Fetch a single credential by its internal wallet UUID.
 *
 * Spec: GET /credentials/{id}
 * Response: CredentialRecord
 */
export async function getCredentialById(id: string): Promise<CredentialRecord> {
  return apiGet<CredentialRecord>(`/credentials/${encodeURIComponent(id)}`)
}
