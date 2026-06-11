import { ApiError } from '../../api/client'
import { ContractError } from '../../api/validation'
import { PresentationError } from '../../api/presentation/errors'
import type { PresentationError as PresentationErrorShape } from '../../types/presentation'

export function toPresentationError(error: unknown): PresentationErrorShape {
  if (error instanceof PresentationError) {
    return {
      httpStatus: error.httpStatus,
      code: error.code,
      message: error.message,
      error_description: error.error_description,
    }
  }

  if (error instanceof ContractError) {
    return {
      httpStatus: 502,
      code: 'internal_error',
      message: 'The server returned an unexpected response. Please try again.',
      error_description: error.message,
    }
  }

  if (error instanceof ApiError) {
    return {
      httpStatus: error.status,
      code: error.errorCode ?? 'internal_error',
      message: error.message,
      error_description: error.errorDescription,
    }
  }

  if (error instanceof Error) {
    return {
      httpStatus: 0,
      code: 'internal_error',
      message: error.message,
      error_description: null,
    }
  }

  return {
    httpStatus: 0,
    code: 'internal_error',
    message: 'An unexpected error occurred while processing the presentation request.',
    error_description: null,
  }
}

export function presentationUserMessage(error: PresentationErrorShape): string {
  if (error.error_description?.trim()) {
    return error.error_description.trim()
  }

  switch (error.code) {
    case 'invalid_request':
      return error.message
    case 'invalid_presentation_request':
      return 'This presentation request is invalid or has expired. Please ask the verifier for a new QR code.'
    case 'invalid_credential_selection':
      return 'The selected credential is not valid for this proof request. Please choose again.'
    case 'transaction_data_not_acknowledged':
      return 'Please review and confirm the transaction details before sharing your credentials.'
    case 'verifier_metadata_fetch_failed':
      return "We couldn't load information about the verifier. Please try again."
    case 'no_matching_credentials':
      return "You don't have a credential that satisfies this proof request."
    case 'presentation_build_failed':
      return 'We could not prepare your presentation. Please try again.'
    case 'verifier_submission_failed':
      return 'The verifier could not receive your presentation. Please try again.'
    case 'session_not_found':
      return 'This presentation session has expired. Please scan the QR code again.'
    case 'unauthorized':
      return 'Your wallet session has expired. Please register again and retry.'
    case 'internal_error':
    default:
      return (
        error.message || 'Something went wrong while processing the presentation request.'
      )
  }
}
