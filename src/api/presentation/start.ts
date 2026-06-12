import { apiPost } from '../client'
import type {
  StartPresentationRequest,
  StartPresentationResponse,
} from '../../types/presentation'
import { validateStartPresentationResponse } from './validation'

export { PresentationError } from './errors'

/**
 * Start an OpenID4VP presentation session.
 *
 * Spec: POST /presentation/start
 * Request:  StartPresentationRequest
 * Response: StartPresentationResponse (201)
 *
 * The response is validated against the OpenAPI contract before being returned.
 * A `ContractError` is thrown if the backend response does not conform.
 */
export async function startPresentation(
  body: StartPresentationRequest
): Promise<StartPresentationResponse> {
  const raw = await apiPost<unknown, StartPresentationRequest>(
    '/presentation/start',
    body
  )
  return validateStartPresentationResponse(raw)
}
