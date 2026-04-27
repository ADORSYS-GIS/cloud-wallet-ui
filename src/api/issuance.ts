import { apiPost } from './client'
import type { StartIssuanceResponse } from '../types/issuance'
import type { IssuanceApiError, IssuanceErrorCode } from '../types/issuance'
import { validateStartIssuanceResponse } from './validation'

/**
 * Structured error thrown when the backend returns a non-2xx response for any
 * issuance endpoint, or when the response body contains a machine-readable
 * error code conforming to the OpenAPI `ErrorResponse` schema.
 *
 * Consumers (hooks, pages) should `instanceof` check for this class to
 * distinguish spec-defined API errors from unexpected network failures.
 */
export class IssuanceError extends Error {
  public readonly httpStatus: number
  public readonly error: IssuanceErrorCode
  public readonly error_description: string | null

  constructor(apiError: IssuanceApiError) {
    super(apiError.error_description ?? apiError.error)
    this.name = 'IssuanceError'
    this.httpStatus = apiError.httpStatus
    this.error = apiError.error
    this.error_description = apiError.error_description
  }
}

/**
 * Submit a raw credential offer string (scanned from a QR code) to start an
 * issuance session.
 *
 * Spec: POST /issuance/start
 * Request:  { offer: string }
 * Response: StartIssuanceResponse (201)
 *
 * The response is validated against the OpenAPI contract before being returned.
 * A `ContractError` is thrown if the backend response does not conform.
 * An `IssuanceError` is thrown for non-2xx HTTP responses.
 */
export async function startIssuanceSession(
  offer: string
): Promise<StartIssuanceResponse> {
  const raw = await apiPost<unknown, { offer: string }>('/issuance/start', { offer })
  return validateStartIssuanceResponse(raw)
}
