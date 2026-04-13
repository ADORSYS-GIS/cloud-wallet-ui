import { getApiBaseUrl } from '../utils/env'
import type { IssuanceApiError, StartIssuanceResponse } from '../types/issuance'

// ---------------------------------------------------------------------------
// Typed error class for issuance API failures.
// Carries the structured error body from the backend when available.
// ---------------------------------------------------------------------------

export class IssuanceError extends Error {
  readonly httpStatus: number
  readonly error: IssuanceApiError['error']
  readonly error_description: string | null

  constructor(apiError: IssuanceApiError) {
    super(apiError.error_description ?? apiError.error)
    this.name = 'IssuanceError'
    this.httpStatus = apiError.httpStatus
    this.error = apiError.error
    this.error_description = apiError.error_description
  }
}

// ---------------------------------------------------------------------------
// Internal fetch helper scoped to issuance — preserves error body parsing.
// ---------------------------------------------------------------------------

async function issuancePost<TResponse, TBody>(
  path: string,
  body: TBody
): Promise<TResponse> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    // Attempt to parse the structured error body from the backend.
    let error: IssuanceApiError['error'] = 'internal_error'
    let error_description: string | null = null

    try {
      const errorBody = (await response.json()) as {
        error?: string
        error_description?: string
      }
      if (typeof errorBody.error === 'string') {
        error = errorBody.error
      }
      if (typeof errorBody.error_description === 'string') {
        error_description = errorBody.error_description
      }
    } catch {
      // Body was not JSON — fall back to generic codes derived from HTTP status.
      error = httpStatusToErrorCode(response.status)
    }

    throw new IssuanceError({ httpStatus: response.status, error, error_description })
  }

  return (await response.json()) as TResponse
}

function httpStatusToErrorCode(status: number): IssuanceApiError['error'] {
  switch (status) {
    case 400:
      return 'invalid_credential_offer'
    case 401:
      return 'unauthorized'
    case 502:
      return 'issuer_metadata_fetch_failed'
    default:
      return 'internal_error'
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Submit a raw credential offer string (scanned from a QR code) to start an
 * issuance session.
 *
 * Spec: POST /issuance/start
 * Request:  { offer: string }
 * Response: StartIssuanceResponse
 *
 * @throws {IssuanceError} on any non-2xx response with structured error info.
 */
export function startIssuanceSession(offer: string): Promise<StartIssuanceResponse> {
  return issuancePost<StartIssuanceResponse, { offer: string }>('/issuance/start', {
    offer,
  })
}
