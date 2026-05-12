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

const REQUEST_TIMEOUT_MS = 15_000

/** OpenAPI: 502 on issuance routes when metadata endpoints are unreachable. */
const HTTP_STATUS_BAD_GATEWAY = 502

const GATEWAY_METADATA_ERROR_CODES = new Set([
  'issuer_metadata_fetch_failed',
  'auth_server_metadata_fetch_failed',
])

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

function messageForBadGateway(
  method: 'GET' | 'POST',
  path: string,
  payload: ApiErrorPayload
): string {
  if (payload.errorDescription) {
    return payload.errorDescription
  }
  if (payload.errorCode && GATEWAY_METADATA_ERROR_CODES.has(payload.errorCode)) {
    return payload.errorCode === 'issuer_metadata_fetch_failed'
      ? 'Could not reach the credential issuer metadata endpoint (502 Bad Gateway).'
      : 'Could not reach the authorization server metadata endpoint (502 Bad Gateway).'
  }
  if (payload.errorCode) {
    return `${method} ${path} failed with 502 (${payload.errorCode}).`
  }
  return `The wallet backend could not reach the credential issuer or authorization server (${method} ${path}, 502). Please try again.`
}

async function buildApiError(
  method: 'GET' | 'POST',
  path: string,
  response: Response
): Promise<ApiError> {
  const payload = await parseApiErrorPayload(response)
  const fallbackMessage = `${method} ${path} failed with ${response.status}`
  const message =
    response.status === HTTP_STATUS_BAD_GATEWAY
      ? messageForBadGateway(method, path, payload)
      : (payload.errorDescription ?? fallbackMessage)
  return new ApiError(response.status, message, {
    errorCode: payload.errorCode,
    errorDescription: payload.errorDescription,
  })
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
    throw await buildApiError('GET', path, response)
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
    throw await buildApiError('POST', path, response)
  }

  // 204 No Content — spec uses this for DELETE-like operations (e.g. cancel session).
  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}
