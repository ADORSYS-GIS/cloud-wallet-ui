import { describe, expect, it } from 'vitest'
import { routes } from '../../../constants/routes'
import { consentSubmissionRetryPath } from '../consentErrorRetry'

describe('consentSubmissionRetryPath', () => {
  it('retries proof details for recoverable consent failures', () => {
    expect(consentSubmissionRetryPath('presentation_build_failed')).toBe(
      routes.presentationProofDetails
    )
    expect(consentSubmissionRetryPath('invalid_credential_selection')).toBe(
      routes.presentationProofDetails
    )
  })

  it('retries scan for expired or malformed sessions', () => {
    expect(consentSubmissionRetryPath('session_not_found')).toBe(
      `${routes.scan}?fresh=true`
    )
    expect(consentSubmissionRetryPath('invalid_request')).toBe(
      `${routes.scan}?fresh=true`
    )
  })

  it('returns undefined for codes without a defined retry target', () => {
    expect(consentSubmissionRetryPath('unauthorized')).toBeUndefined()
  })
})
