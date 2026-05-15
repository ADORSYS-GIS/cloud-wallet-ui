import { apiPost } from './client'
import type { ConsentResponse, TxCodeResponse } from '../types/issuance'
import { validateConsentResponse, validateTxCodeResponse } from './validation'

/**
 * Submit user consent for a credential offer.
 *
 * Spec: POST /issuance/{session_id}/consent
 * Request:  { accepted: boolean, selected_configuration_ids?: string[] }
 * Response: ConsentResponse (200)
 *
 * The response is validated against the OpenAPI contract before being returned.
 * A `ContractError` is thrown if the backend response does not conform.
 */
export async function submitConsent(
  sessionId: string,
  accepted: boolean,
  selectedConfigurationIds: string[] = []
): Promise<ConsentResponse> {
  const raw = await apiPost<
    unknown,
    { accepted: boolean; selected_configuration_ids: string[] }
  >(`/issuance/${encodeURIComponent(sessionId)}/consent`, {
    accepted,
    selected_configuration_ids: selectedConfigurationIds,
  })
  return validateConsentResponse(raw)
}

/**
 * Submit the transaction code for pre-authorized code flow.
 *
 * Spec: POST /issuance/{session_id}/tx-code
 * Request:  { tx_code: string }
 * Response: TxCodeResponse (202)
 *
 * The response is validated against the OpenAPI contract before being returned.
 * A `ContractError` is thrown if the backend response does not conform.
 */
export async function submitTxCode(
  sessionId: string,
  txCode: string
): Promise<TxCodeResponse> {
  const raw = await apiPost<unknown, { tx_code: string }>(
    `/issuance/${encodeURIComponent(sessionId)}/tx-code`,
    { tx_code: txCode }
  )
  return validateTxCodeResponse(raw)
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
