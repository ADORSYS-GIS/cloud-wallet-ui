import { getApiBaseUrl } from '../utils/env'
import { getBearerToken } from '../auth/authService'

/**
 * Spec-compliant API client.
 *
 * Contract rules enforced here:
 * - Only the HTTP methods defined in the OpenAPI spec are used (GET, POST).
 * - Non-2xx responses always throw — no fallback, no retry, no method switching.
 * - 204 No Content responses return `undefined` (used by DELETE/cancel endpoints).
 * - Every successful response with a body is parsed as JSON.
 * - No undocumented endpoints may be called through this module.
 * - Every request carries an `Authorization: Bearer <JWT>` header obtained
 *   from the auth service (spec: BearerAuth security scheme).
 */

export class ApiError extends Error {
  public readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getBearerToken()
  return {
    Authorization: `Bearer ${token}`,
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: await authHeaders(),
  })

  if (!response.ok) {
    throw new ApiError(response.status, `GET ${path} failed with ${response.status}`)
  }

  return (await response.json()) as T
}

export async function apiPost<TResponse, TBody>(
  path: string,
  body: TBody
): Promise<TResponse> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new ApiError(response.status, `POST ${path} failed with ${response.status}`)
  }

  // 204 No Content — spec uses this for DELETE-like operations (e.g. cancel session).
  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}
