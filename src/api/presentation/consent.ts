import { apiPost } from '../client'
import type {
  PresentationConsentRequest,
  PresentationConsentResponse,
  SelectedCredential,
} from '../../types/presentation'
import { validatePresentationConsentResponse } from './validation'

export { PresentationError } from './errors'

/**
 * Build the consent request body from UI selections (camelCase → API snake_case).
 */
export function buildPresentationConsentRequest(
  accepted: boolean,
  selectedCredentials: SelectedCredential[] = [],
  transactionDataAcknowledged?: boolean
): PresentationConsentRequest {
  if (!accepted) {
    return { accepted: false }
  }

  const body: PresentationConsentRequest = {
    accepted: true,
    selected_credentials: selectedCredentials.map((credential) => ({
      query_id: credential.queryId,
      credential_id: credential.credentialId,
    })),
  }

  if (transactionDataAcknowledged !== undefined) {
    body.transaction_data_acknowledged = transactionDataAcknowledged
  }

  return body
}

/**
 * Submit the user's presentation consent decision.
 *
 * Spec: POST /presentation/{session_id}/consent
 * Request:  PresentationConsentRequest
 * Response: PresentationConsentResponse (200)
 *
 * The backend constructs and submits the VP Token to the Verifier synchronously.
 * The response is validated against the OpenAPI contract before being returned.
 */
export async function submitPresentationConsent(
  sessionId: string,
  body: PresentationConsentRequest
): Promise<PresentationConsentResponse> {
  const raw = await apiPost<unknown, PresentationConsentRequest>(
    `/presentation/${encodeURIComponent(sessionId)}/consent`,
    body
  )
  return validatePresentationConsentResponse(raw)
}
