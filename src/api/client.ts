import { getAuthorizationHeader } from '../auth/tenant'
import { getApiBaseUrl } from '../utils/env'

// ---------------------------------------------------------------------------
// Shared response handling
// ---------------------------------------------------------------------------

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

// ---------------------------------------------------------------------------
// Authenticated helpers
// ---------------------------------------------------------------------------

/**
 * Perform an authenticated GET request.
 * Attaches a freshly-minted Bearer JWT on every call.
 */
export async function apiGet<T>(path: string): Promise<T> {
  const authorization = await getAuthorizationHeader()

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Authorization: authorization },
  })

  return handleResponse<T>(response)
}

/**
 * Perform an authenticated POST request.
 * Attaches a freshly-minted Bearer JWT on every call.
 */
export async function apiPost<TResponse, TBody>(
  path: string,
  body: TBody
): Promise<TResponse> {
  const authorization = await getAuthorizationHeader()

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify(body),
  })

  return handleResponse<TResponse>(response)
}