import { getApiBaseUrl } from '../utils/env'

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`)

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`)
  }

  return (await response.json()) as T
}
