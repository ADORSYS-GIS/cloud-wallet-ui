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

const REQUEST_TIMEOUT_MS = 15_000

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(408, `Request timed out after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getBearerToken()
  return {
    Authorization: `Bearer ${token}`,
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}${path}`,
    {
      headers: await authHeaders(),
    },
    REQUEST_TIMEOUT_MS
  )

  if (!response.ok) {
    throw new ApiError(response.status, `GET ${path} failed with ${response.status}`)
  }

  return (await response.json()) as T
}

export async function apiPost<TResponse, TBody>(
  path: string,
  body: TBody
): Promise<TResponse> {
  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}${path}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await authHeaders()),
      },
      body: JSON.stringify(body),
    },
    REQUEST_TIMEOUT_MS
  )

  if (!response.ok) {
    throw new ApiError(response.status, `POST ${path} failed with ${response.status}`)
  }

  // 204 No Content — spec uses this for DELETE-like operations (e.g. cancel session).
  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}
