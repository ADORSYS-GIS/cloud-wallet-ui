import type { PresentationErrorCode } from '../../types/presentation'

/**
 * Structured error thrown when the backend returns a non-2xx response for
 * presentation endpoints.
 */
export class PresentationError extends Error {
  public readonly httpStatus: number
  public readonly code: PresentationErrorCode
  public readonly error_description: string | null

  constructor(error: {
    httpStatus: number
    code: PresentationErrorCode
    message: string
    error_description?: string | null
  }) {
    super(error.message)
    this.name = 'PresentationError'
    this.httpStatus = error.httpStatus
    this.code = error.code
    this.error_description = error.error_description ?? null
  }
}
