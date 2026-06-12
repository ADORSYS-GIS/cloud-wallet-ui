import { ApiError } from '../../api/client'
import { ContractError } from '../../api/validation'
import { PresentationError } from '../../api/presentation/start'
import type { PresentationError as PresentationErrorShape } from '../../types/presentation'
import {
  presentationErrorContent,
  resolvePresentationErrorVariant,
} from './presentationErrorVariant'

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
  const variant = resolvePresentationErrorVariant(error)
  const content = presentationErrorContent(variant, error)
  if (content.guidance) {
    return `${content.message}\n\n${content.guidance}`
  }
  return content.message
}
