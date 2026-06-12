import type {
  PresentationError,
  PresentationErrorVariant,
} from '../../types/presentation'

export type PresentationErrorContent = {
  title: string
  message: string
  guidance?: string
}

export type PresentationErrorActions = {
  canRetry: boolean
  canStartOver: boolean
}

const NETWORK_HTTP_STATUSES = new Set([0, 408, 502, 503, 504])

const NETWORK_ERROR_CODES = new Set([
  'request_uri_fetch_failed',
  'verifier_metadata_fetch_failed',
])

const EXPIRED_ERROR_CODES = new Set(['session_not_found', 'invalid_presentation_request'])

const REJECTED_ERROR_CODES = new Set(['user_rejected', 'verifier_submission_failed'])

const UNSUPPORTED_CREDENTIAL_CODES = new Set([
  'no_matching_credentials',
  'vp_formats_not_supported',
])

const INVALID_REQUEST_CODES = new Set([
  'invalid_request',
  'invalid_dcql_query',
  'invalid_client',
  'invalid_credential_selection',
  'transaction_data_not_acknowledged',
  'request_object_invalid',
  'invalid_session_state',
])

function isNetworkError(error: PresentationError): boolean {
  const status = error.httpStatus ?? 0
  if (NETWORK_HTTP_STATUSES.has(status)) {
    return true
  }
  return NETWORK_ERROR_CODES.has(error.code)
}

export function resolvePresentationErrorVariant(
  error: PresentationError
): PresentationErrorVariant {
  if (EXPIRED_ERROR_CODES.has(error.code)) {
    return 'expired'
  }
  if (REJECTED_ERROR_CODES.has(error.code)) {
    return 'rejected'
  }
  if (UNSUPPORTED_CREDENTIAL_CODES.has(error.code)) {
    return 'unsupported_credential'
  }
  if (INVALID_REQUEST_CODES.has(error.code)) {
    return 'invalid_request'
  }
  if (error.code === 'presentation_build_failed') {
    return 'proof_generation'
  }
  if (isNetworkError(error)) {
    return 'network'
  }
  return 'generic'
}

function detailSuffix(error: PresentationError): string | null {
  const detail = error.error_description?.trim()
  if (!detail) {
    return null
  }
  return detail
}

export function presentationErrorContent(
  variant: PresentationErrorVariant,
  error: PresentationError
): PresentationErrorContent {
  const detail = detailSuffix(error)

  switch (variant) {
    case 'network':
      return {
        title: 'Connection problem',
        message:
          'We could not reach the verifier or your wallet service. Check your internet connection and try again.',
        guidance: detail ?? undefined,
      }
    case 'expired':
      return {
        title: 'Request expired',
        message:
          'This proof request is no longer valid. Presentation sessions expire after a short time for your security.',
        guidance:
          detail ??
          'Ask the verifier to generate a new QR code or link, then scan it again.',
      }
    case 'rejected':
      return {
        title: 'Request declined',
        message:
          'The verifier did not accept the presentation. No information was shared from your wallet.',
        guidance: detail ?? 'You can return to your wallet or start a new proof request.',
      }
    case 'unsupported_credential':
      return {
        title: 'Credential not available',
        message:
          "You don't have a credential that meets this proof request, or the requested format is not supported.",
        guidance:
          detail ??
          'Check that you have the required credential in your wallet, or ask the verifier to request a supported format.',
      }
    case 'invalid_request':
      return {
        title: 'Invalid request',
        message:
          'The proof request could not be processed because it is missing information or contains invalid parameters.',
        guidance: detail ?? 'Ask the verifier for a new QR code or link and try again.',
      }
    case 'proof_generation':
      return {
        title: 'Could not create proof',
        message:
          'Your wallet could not generate the verifiable presentation required by the verifier.',
        guidance:
          detail ??
          'This is usually temporary. Try again, or contact support if the problem continues.',
      }
    case 'generic':
    default:
      return {
        title: 'Something went wrong',
        message:
          error.message ||
          'An unexpected error occurred while processing the presentation request.',
        guidance:
          detail ??
          (error.code === 'unauthorized'
            ? 'Your wallet session may have expired. Return to the wallet and try again.'
            : 'Return to your wallet and try again later.'),
      }
  }
}

export function presentationErrorActions(
  variant: PresentationErrorVariant
): PresentationErrorActions {
  switch (variant) {
    case 'network':
    case 'proof_generation':
      return { canRetry: true, canStartOver: true }
    case 'expired':
    case 'invalid_request':
      return { canRetry: false, canStartOver: true }
    case 'rejected':
    case 'unsupported_credential':
      return { canRetry: false, canStartOver: false }
    case 'generic':
    default:
      return { canRetry: false, canStartOver: true }
  }
}

/** Structured console logging for presentation failures (debugging). */
export function logPresentationError(
  error: PresentationError,
  variant: PresentationErrorVariant,
  context?: Record<string, unknown>
): void {
  console.error('[PresentationError]', {
    variant,
    code: error.code,
    httpStatus: error.httpStatus ?? null,
    message: error.message,
    error_description: error.error_description ?? null,
    ...context,
  })
}
