import { useCallback, useRef, useState } from 'react'
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
  isSubmitting: boolean
  isSharing: boolean
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
 * - Decline (`accepted: false`): returns to home immediately; consent POST runs in background.
 * - Share `rejected` / API errors: routes to the error screen (#92).
 */
export function usePresentationSubmission(): UsePresentationSubmissionReturn {
  const navigate = useNavigate()
  const presentation = usePresentationState()
  const inFlightRef = useRef(false)
  const [isSharing, setIsSharing] = useState(false)

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

      if (!accepted) {
        navigate(routes.home, { replace: true })
        presentation.clear()
        inFlightRef.current = false

        void submitPresentationConsent(
          sessionId,
          buildPresentationConsentRequest(false)
        ).catch((error: unknown) => {
          console.error('[PresentationConsent] Decline submission failed:', error)
        })
        return
      }

      setIsSharing(true)
      presentation.setStatus('submitting')

      try {
        const body = buildPresentationConsentRequest(
          true,
          selectedCredentials,
          transactionDataAcknowledged
        )
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

        if (response.status === 'rejected') {
          const result = toPresentationResult('rejected', null, null)
          presentation.setSubmissionResult(result)
          navigate(routes.home, { replace: true })
          return
        }

        presentation.setSubmissionResult(
          toPresentationResult(
            response.status,
            response.redirect_uri,
            response.verifier_response
          )
        )
        navigate(routes.presentationError, { replace: true })
      } catch (error: unknown) {
        const apiError = toPresentationError(error)
        presentation.setError(apiError)
        navigate(routes.presentationError, { replace: true })
      } finally {
        inFlightRef.current = false
        setIsSharing(false)
      }
    },
    [navigate, presentation]
  )

  return { isSubmitting, isSharing, submitConsent }
}
