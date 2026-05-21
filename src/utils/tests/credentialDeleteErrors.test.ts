import { describe, expect, it } from 'vitest'
import { ApiError } from '../../api/client'
import { credentialDeleteErrorMessage } from '../credentialDeleteErrors'

describe('credentialDeleteErrorMessage', () => {
  it('returns forbidden message for 403 responses', () => {
    const error = new ApiError(403, 'Forbidden', {
      errorCode: 'forbidden',
      errorDescription: 'You cannot delete this credential.',
    })

    expect(credentialDeleteErrorMessage(error)).toBe('You cannot delete this credential.')
  })

  it('returns not-found message for credential_not_found', () => {
    const error = new ApiError(404, 'Not found', {
      errorCode: 'credential_not_found',
      errorDescription: 'Credential was not found.',
    })

    expect(credentialDeleteErrorMessage(error)).toBe('Credential was not found.')
  })

  it('returns a friendly message for 404 without credential_not_found', () => {
    const error = new ApiError(404, 'DELETE /credentials/id failed with 404')

    expect(credentialDeleteErrorMessage(error)).toBe(
      'This credential is no longer available in your wallet.'
    )
  })

  it('returns a friendly message when delete is not implemented', () => {
    const error = new ApiError(501, 'DELETE /credentials/id failed with 501')

    expect(credentialDeleteErrorMessage(error)).toBe(
      'Failed to delete credential, please try again'
    )
  })

  it('returns a friendly message for network failures', () => {
    expect(credentialDeleteErrorMessage(new TypeError('Failed to fetch'))).toBe(
      'Could not reach the wallet service. Check your connection and try again.'
    )
  })

  it('returns a generic fallback for unknown errors', () => {
    expect(credentialDeleteErrorMessage(null)).toBe(
      'Could not remove this credential. Please try again.'
    )
  })
})
