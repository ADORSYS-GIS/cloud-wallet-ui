import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  buildPresentationConsentRequest,
  submitPresentationConsent,
} from '../../api/presentation/consent'
import { routes } from '../../constants/routes'
import { usePresentationState } from '../../state/presentation.state'
import type { PresentationResult, SelectedCredential } from '../../types/presentation'
import { toPresentationError } from '../../utils/presentation/presentationErrors'

export type PresentationSubmissionParams = {
  sessionId: string
  accepted: boolean
  selectedCredentials?: SelectedCredential[]
  transactionDataAcknowledged?: boolean
}

export type UsePresentationSubmissionReturn = {
  /** True while POST /presentation/{session_id}/consent is in flight. */
  isSubmitting: boolean
  submitConsent: (params: PresentationSubmissionParams) => Promise<void>
}

function toPresentationResult(
  status: 'completed' | 'rejected',
  redirect_uri: string | null,
  verifier_response: Record<string, unknown> | null
): PresentationResult {
  return {
    success: status === 'completed',
    status,
    redirect_uri,
    verifier_response,
  }
}

/**
 * Orchestrates synchronous presentation consent submission.
 *
 * - Sets `submitting` status and shows loading while the backend builds/submits the VP Token.
 * - Same-device `completed` + `redirect_uri`: navigates the browser back to the Verifier.
 * - Cross-device `completed`: updates state and routes to the success screen.
 * - `rejected`: valid user outcome — routes to the rejection screen (not an error).
 * - API errors: updates state and routes to the error screen.
 */
export function usePresentationSubmission(): UsePresentationSubmissionReturn {
  const navigate = useNavigate()
  const presentation = usePresentationState()
  const inFlightRef = useRef(false)

  const isSubmitting = presentation.status === 'submitting'

  const submitConsent = useCallback(
    async ({
      sessionId,
      accepted,
      selectedCredentials = [],
      transactionDataAcknowledged,
    }: PresentationSubmissionParams) => {
      if (inFlightRef.current) {
        return
      }

      inFlightRef.current = true
      presentation.setStatus('submitting')

      try {
        const body = accepted
          ? buildPresentationConsentRequest(
              true,
              selectedCredentials,
              transactionDataAcknowledged
            )
          : buildPresentationConsentRequest(false)
        const response = await submitPresentationConsent(sessionId, body)

        if (response.status === 'completed') {
          const result = toPresentationResult(
            response.status,
            response.redirect_uri,
            response.verifier_response
          )
          presentation.setSubmissionResult(result)

          if (response.redirect_uri) {
            window.location.assign(response.redirect_uri)
            return
          }

          navigate(routes.presentationSuccess)
          return
        }

        presentation.setSubmissionResult(
          toPresentationResult(
            response.status,
            response.redirect_uri,
            response.verifier_response
          )
        )
        navigate(routes.presentationRejected)
      } catch (error: unknown) {
        const apiError = toPresentationError(error)
        presentation.setError(apiError)
        navigate(routes.presentationError)
      } finally {
        inFlightRef.current = false
      }
    },
    [navigate, presentation]
  )

  return { isSubmitting, submitConsent }
}
