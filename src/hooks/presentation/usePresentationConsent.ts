import { useCallback, useState } from 'react'
import { submitPresentationConsent } from '../../api/presentation/consent'
import { usePresentationState } from '../../state/presentation.state'
import type {
  PresentationConsentResponse,
  PresentationError,
} from '../../types/presentation'
import { autoSelectCredentials } from '../../utils/presentation/autoSelectCredentials'
import { toPresentationError } from '../../utils/presentation/presentationErrors.ts'

export type PresentationConsentState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; response: PresentationConsentResponse }
  | { status: 'error'; error: PresentationError }

export type UsePresentationConsentReturn = {
  consentState: PresentationConsentState
  submitShare: () => Promise<void>
  submitDecline: () => Promise<void>
}

export function usePresentationConsent(): UsePresentationConsentReturn {
  const [consentState, setConsentState] = useState<PresentationConsentState>({
    status: 'idle',
  })
  const presentation = usePresentationState()

  const submitShare = useCallback(async () => {
    const sessionId = presentation.sessionId
    const credentialMatches = presentation.credentialMatches

    if (!sessionId || !credentialMatches?.length) {
      presentation.setError({
        code: 'invalid_session_state',
        message: 'Presentation session is not ready for consent.',
      })
      return
    }

    const selectedCredentials =
      presentation.selectedCredentials ?? autoSelectCredentials(credentialMatches)

    if (selectedCredentials.length === 0) {
      presentation.setError({
        code: 'no_matching_credentials',
        message: 'No credentials are available to share.',
      })
      return
    }

    setConsentState({ status: 'submitting' })
    presentation.setStatus('submitting')
    presentation.setSelectedCredentials(selectedCredentials)

    try {
      const response = await submitPresentationConsent(sessionId, {
        accepted: true,
        selected_credentials: selectedCredentials,
        ...(presentation.transactionData?.length
          ? { transaction_data_acknowledged: true }
          : {}),
      })

      presentation.setConsentResponse(response)
      setConsentState({ status: 'success', response })

      if (response.status === 'completed' && response.redirect_uri) {
        window.location.assign(response.redirect_uri)
      }
    } catch (error: unknown) {
      const apiError = toPresentationError(error)
      presentation.setError(apiError)
      setConsentState({ status: 'error', error: apiError })
    }
  }, [presentation])

  const submitDecline = useCallback(async () => {
    const sessionId = presentation.sessionId

    setConsentState({ status: 'submitting' })
    presentation.setStatus('submitting')

    if (!sessionId) {
      presentation.clear()
      setConsentState({ status: 'idle' })
      return
    }

    try {
      const response = await submitPresentationConsent(sessionId, { accepted: false })
      presentation.setConsentResponse(response, {
        code: 'user_rejected',
        message: 'You declined to share your credentials.',
      })
      setConsentState({ status: 'success', response })
    } catch {
      presentation.clear()
      setConsentState({ status: 'idle' })
    }
  }, [presentation])

  return { consentState, submitShare, submitDecline }
}
