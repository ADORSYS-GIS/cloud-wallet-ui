import { apiPost } from '../client'
import type {
  PresentationAuthorizationRequest,
  StartPresentationResponse,
} from '../../types/presentation'
import { buildStartPresentationRequest } from '../../utils/presentation/buildStartRequest'
import { validateStartPresentationResponse } from './validation'

export { PresentationError } from './errors'

/**
 * Start an OpenID4VP presentation session.
 *
 * Spec: POST /presentation/start
 */
export async function startPresentation(
  authorization: PresentationAuthorizationRequest,
  origin?: string
): Promise<StartPresentationResponse> {
  const body = buildStartPresentationRequest(authorization, origin)
  const raw = await apiPost<unknown, typeof body>('/presentation/start', body)
  return validateStartPresentationResponse(raw)
}
