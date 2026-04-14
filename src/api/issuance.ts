import { apiPost } from './client'
import type { StartIssuanceResponse } from '../types/issuance'
import { validateStartIssuanceResponse } from './validation'

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
 */
export function startIssuanceSession(offer: string): Promise<StartIssuanceResponse> {
  return apiPost<unknown, { offer: string }>('/issuance/start', { offer }).then((raw) =>
    validateStartIssuanceResponse(raw)
  )
}
