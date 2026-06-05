import { ApiError } from '../api/client'

export type PresentationActivityErrorContext = 'list' | 'detail' | 'delete' | 'load_more'

export function presentationActivityUserMessage(
  error: unknown,
  context: PresentationActivityErrorContext = 'list'
): string {
  if (error instanceof ApiError) {
    const detail = error.errorDescription?.trim()
    if (detail) return detail

    if (error.status === 401) {
      return 'Your session has expired. Please sign in again.'
    }

    if (error.status === 404) {
      switch (context) {
        case 'detail':
          return 'This presentation record could not be found. It may have been removed or expired.'
        case 'delete':
          return 'This record was already removed or could not be found.'
        case 'load_more':
          return 'Could not load more activity. The list may have changed — refresh and try again.'
        default:
          return 'Activity history is not available right now. Try again later or contact your administrator if this continues.'
      }
    }

    if (error.status === 408) {
      return 'Loading activity history timed out. Check your connection and try again.'
    }

    if (error.status >= 500) {
      switch (context) {
        case 'delete':
          return 'Could not delete this record. The server encountered an error — please try again.'
        case 'detail':
          return 'Could not load presentation details. The server encountered an error — please try again.'
        default:
          return 'Could not load activity history. The server encountered an error — please try again later.'
      }
    }

    return context === 'delete'
      ? 'Could not delete this presentation record. Please try again.'
      : 'Could not load activity history. Please try again.'
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'The request was cancelled. Please try again.'
  }

  if (error instanceof TypeError) {
    return 'Could not reach the wallet backend. Check your connection and try again.'
  }

  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.trim()
    if (/failed with \d{3}/i.test(msg) || msg.startsWith('GET ') || msg.startsWith('DELETE ')) {
      return presentationActivityUserMessage(new ApiError(0, msg), context)
    }
    return msg
  }

  switch (context) {
    case 'delete':
      return 'Could not delete this presentation record.'
    case 'detail':
      return 'Could not load presentation details.'
    case 'load_more':
      return 'Could not load more presentation activity.'
    default:
      return 'Could not load activity history.'
  }
}
