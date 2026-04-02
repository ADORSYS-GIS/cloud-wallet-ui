import { apiGet } from './client'
import type { CredentialDetail, CredentialsListResponse } from '../types/credential'

function normalizeListPayload(data: unknown): CredentialsListResponse {
  if (Array.isArray(data)) {
    return { items: data as CredentialsListResponse['items'] }
  }
  if (data && typeof data === 'object' && 'items' in data && Array.isArray((data as CredentialsListResponse).items)) {
    return data as CredentialsListResponse
  }
  return { items: [] }
}

export async function getCredentials(): Promise<CredentialsListResponse> {
  const data = await apiGet<unknown>('/credentials')
  return normalizeListPayload(data)
}

export async function getCredentialById(id: string): Promise<CredentialDetail> {
  return apiGet<CredentialDetail>(`/credentials/${encodeURIComponent(id)}`)
}
