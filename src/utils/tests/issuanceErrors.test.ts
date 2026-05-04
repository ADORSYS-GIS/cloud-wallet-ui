import { describe, expect, it } from 'vitest'
import { ApiError } from '../../api/client'
import { IssuanceError } from '../../api/issuance'
import { issuanceUserMessage, toIssuanceApiError } from '../issuanceErrors'

describe('toIssuanceApiError', () => {
  it('maps IssuanceError instances without losing fields', () => {
    const error = new IssuanceError({
      httpStatus: 401,
      error: 'unauthorized',
      error_description: 'Token expired',
    })

    expect(toIssuanceApiError(error)).toEqual({
      httpStatus: 401,
      error: 'unauthorized',
      error_description: 'Token expired',
    })
  })

  it('maps ApiError instances into issuance-compatible errors', () => {
    const error = new ApiError(500, 'Boom', {
      errorCode: 'internal_error',
      errorDescription: 'Unexpected backend failure',
    })

    expect(toIssuanceApiError(error)).toEqual({
      httpStatus: 500,
      error: 'internal_error',
      error_description: 'Unexpected backend failure',
    })
  })

  it('maps ApiError with null errorCode to internal_error fallback', () => {
    const error = new ApiError(400, 'Bad request', {
      errorCode: null,
      errorDescription: null,
    })

    expect(toIssuanceApiError(error)).toEqual({
      httpStatus: 400,
      error: 'internal_error',
      error_description: null,
    })
  })

  it('falls back to internal_error for unknown error types', () => {
    expect(toIssuanceApiError('badness')).toEqual({
      httpStatus: 0,
      error: 'internal_error',
      error_description: null,
    })
  })
})

describe('issuanceUserMessage', () => {
  it('prefers error_description when present', () => {
    expect(
      issuanceUserMessage({
        httpStatus: 400,
        error: 'invalid_request',
        error_description: 'Readable message from server',
      })
    ).toBe('Readable message from server')
  })

  it('returns mapped message for known issuance codes', () => {
    expect(
      issuanceUserMessage({
        httpStatus: 400,
        error: 'invalid_credential_offer',
        error_description: null,
      })
    ).toContain('valid credential offer')
  })

  it.each([
    ['unauthorized', 'Authentication failed.'],
    ['issuer_metadata_fetch_failed', 'Could not reach the credential issuer.'],
    ['auth_server_metadata_fetch_failed', 'Could not reach the authorization server.'],
    ['invalid_tx_code', 'transaction code is invalid'],
    ['session_not_found', 'issuance session expired'],
    ['invalid_session_state', 'issuance step is no longer valid'],
    ['invalid_request', 'request could not be processed'],
    ['internal_error', 'unexpected server error'],
  ] as const)('maps %s to a friendly message', (error, expectedSnippet) => {
    expect(
      issuanceUserMessage({
        httpStatus: 400,
        error,
        error_description: null,
      })
    ).toContain(expectedSnippet)
  })

  it('returns 5xx default for unknown codes', () => {
    expect(
      issuanceUserMessage({
        httpStatus: 503,
        error: 'access_denied',
        error_description: null,
      })
    ).toContain('server encountered an error')
  })

  it('returns non-5xx default for unknown codes', () => {
    expect(
      issuanceUserMessage({
        httpStatus: 400,
        error: 'access_denied',
        error_description: null,
      })
    ).toContain('could not be completed')
  })
})
