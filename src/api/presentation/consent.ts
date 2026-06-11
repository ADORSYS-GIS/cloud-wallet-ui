import { apiPost } from '../client'
import type {
  PresentationConsentRequest,
  PresentationConsentResponse,
} from '../../types/presentation'
import { validatePresentationConsentResponse } from './validation'

export { PresentationError } from './errors'

/**
 * Submit the user's presentation consent decision.
 *
 * Spec: POST /presentation/{session_id}/consent
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
