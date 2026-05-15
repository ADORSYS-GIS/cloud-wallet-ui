import { ApiError } from '../api/client'

function isTechnicalMessage(message: string): boolean {
  return /^(GET|POST|DELETE|PUT) \//.test(message) || /failed with \d{3}/.test(message)
}

export function credentialDeleteErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Your session has expired. Please restart the wallet and try again.'
    }

    if (error.status === 403) {
      return (
        error.errorDescription ?? 'You do not have permission to remove this credential.'
      )
    }

    if (error.status === 404) {
      if (error.errorCode === 'credential_not_found') {
        return (
          error.errorDescription ??
          'This credential is no longer in your wallet. It may have already been removed.'
        )
      }
      return 'This credential is no longer available in your wallet.'
    }

    if (error.status === 405 || error.status === 501) {
      return 'Removing credentials is not available right now. Please try again later.'
    }

    if (error.status === 408) {
      return 'The request took too long. Check your connection and try again.'
    }

    if (error.status === 502 || error.status === 503) {
      return 'The wallet service is temporarily unavailable. Please try again in a moment.'
    }

    if (error.status >= 500) {
      return 'Something went wrong on our side. Please try again later.'
    }

    if (error.errorDescription && !isTechnicalMessage(error.errorDescription)) {
      return error.errorDescription
    }

    return 'Could not remove this credential. Please try again.'
  }

  if (error instanceof Error) {
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      return 'Could not reach the wallet service. Check your connection and try again.'
    }
    if (!isTechnicalMessage(error.message)) {
      return error.message
    }
  }

  return 'Could not remove this credential. Please try again.'
}
