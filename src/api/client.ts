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
  public readonly errorCode: string | null
  public readonly errorDescription: string | null

  constructor(
    status: number,
    message: string,
    details?: { errorCode?: string | null; errorDescription?: string | null }
  ) {
    super(message)
    this.status = status
    this.errorCode = details?.errorCode ?? null
    this.errorDescription = details?.errorDescription ?? null
    this.name = 'ApiError'
  }
}

type ApiErrorPayload = {
  errorCode: string | null
  errorDescription: string | null
}

async function parseApiErrorPayload(response: Response): Promise<ApiErrorPayload> {
  try {
    const raw = (await response.json()) as unknown
    if (!raw || typeof raw !== 'object') {
      return { errorCode: null, errorDescription: null }
    }
    const maybe = raw as { error?: unknown; error_description?: unknown }
    const errorCode = typeof maybe.error === 'string' ? maybe.error : null
    const errorDescription =
      typeof maybe.error_description === 'string' ? maybe.error_description : null
    return { errorCode, errorDescription }
  } catch {
    return { errorCode: null, errorDescription: null }
  }
}

async function buildApiError(
  method: 'GET' | 'POST',
  path: string,
  response: Response
): Promise<ApiError> {
  const { errorCode, errorDescription } = await parseApiErrorPayload(response)
  const fallbackMessage = `${method} ${path} failed with ${response.status}`
  return new ApiError(response.status, errorDescription ?? fallbackMessage, {
    errorCode,
    errorDescription,
  })
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
    throw await buildApiError('GET', path, response)
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
    throw await buildApiError('POST', path, response)
  }

  // 204 No Content — spec uses this for DELETE-like operations (e.g. cancel session).
  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}
