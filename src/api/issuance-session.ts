import { apiPost } from './client'
import type { ConsentResponse, TxCodeResponse } from '../types/issuance'

/**
 * Submit user consent for a credential offer.
 *
 * Spec: POST /issuance/{session_id}/consent
 * Request:  { accepted: boolean, selected_configuration_ids?: string[] }
 * Response: ConsentResponse (200)
 */
export function submitConsent(
  sessionId: string,
  accepted: boolean,
  selectedConfigurationIds: string[] = []
): Promise<ConsentResponse> {
  return apiPost<
    ConsentResponse,
    { accepted: boolean; selected_configuration_ids: string[] }
  >(`/issuance/${encodeURIComponent(sessionId)}/consent`, {
    accepted,
    selected_configuration_ids: selectedConfigurationIds,
  })
}

/**
 * Submit the transaction code for pre-authorized code flow.
 *
 * Spec: POST /issuance/{session_id}/tx-code
 * Request:  { tx_code: string }
 * Response: TxCodeResponse (202)
 */
export function submitTxCode(sessionId: string, txCode: string): Promise<TxCodeResponse> {
  return apiPost<TxCodeResponse, { tx_code: string }>(
    `/issuance/${encodeURIComponent(sessionId)}/tx-code`,
    { tx_code: txCode }
  )
}

/**
 * Cancel an active issuance session.
 *
 * Spec: POST /issuance/{session_id}/cancel
 * Response: 204 No Content
 */
export function cancelSession(sessionId: string): Promise<void> {
  return apiPost<void, Record<string, never>>(
    `/issuance/${encodeURIComponent(sessionId)}/cancel`,
    {}
  )
}
