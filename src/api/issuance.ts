import { apiPost } from './client'
import type { StartIssuanceResponse } from '../types/issuance'

/**
 * Submit a raw credential offer string (scanned from a QR code) to start an
 * issuance session.
 *
 * Spec: POST /issuance/start
 * Request:  { offer: string }
 * Response: StartIssuanceResponse
 */
export function startIssuanceSession(offer: string): Promise<StartIssuanceResponse> {
  return apiPost<StartIssuanceResponse, { offer: string }>('/issuance/start', { offer })
}
