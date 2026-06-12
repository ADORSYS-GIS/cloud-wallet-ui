import { routes } from '../../constants/routes'
import type { PresentationErrorCode } from '../../types/presentation'

/** Retry target for consent submission failures */
export function consentSubmissionRetryPath(
  code: PresentationErrorCode
): string | undefined {
  switch (code) {
    case 'presentation_build_failed':
    case 'verifier_submission_failed':
    case 'invalid_credential_selection':
    case 'transaction_data_not_acknowledged':
      return routes.presentationProofDetails
    case 'session_not_found':
    case 'invalid_request':
      return `${routes.scan}?fresh=true`
    default:
      return undefined
  }
}
