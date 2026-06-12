import { describe, expect, it } from 'vitest'
import type { PresentationError } from '../../../types/presentation'
import {
  presentationErrorActions,
  presentationErrorContent,
  resolvePresentationErrorVariant,
} from '../presentationErrorVariant'

function error(code: PresentationError['code'], httpStatus?: number): PresentationError {
  return {
    code,
    message: `message for ${code}`,
    httpStatus,
    error_description: null,
  }
}

describe('resolvePresentationErrorVariant', () => {
  it('maps network failures by HTTP status', () => {
    expect(resolvePresentationErrorVariant(error('internal_error', 0))).toBe('network')
    expect(resolvePresentationErrorVariant(error('internal_error', 408))).toBe('network')
    expect(resolvePresentationErrorVariant(error('internal_error', 502))).toBe('network')
  })

  it('maps OpenAPI /presentation/start error codes', () => {
    expect(resolvePresentationErrorVariant(error('request_uri_fetch_failed', 502))).toBe(
      'network'
    )
    expect(resolvePresentationErrorVariant(error('no_matching_credentials', 400))).toBe(
      'unsupported_credential'
    )
    expect(resolvePresentationErrorVariant(error('vp_formats_not_supported', 400))).toBe(
      'unsupported_credential'
    )
    expect(resolvePresentationErrorVariant(error('invalid_dcql_query', 400))).toBe(
      'invalid_request'
    )
    expect(resolvePresentationErrorVariant(error('invalid_client', 400))).toBe(
      'invalid_request'
    )
    expect(resolvePresentationErrorVariant(error('request_object_invalid', 502))).toBe(
      'invalid_request'
    )
  })

  it('maps OpenAPI /presentation/consent error codes', () => {
    expect(resolvePresentationErrorVariant(error('session_not_found', 404))).toBe(
      'expired'
    )
    expect(resolvePresentationErrorVariant(error('presentation_build_failed', 500))).toBe(
      'proof_generation'
    )
    expect(
      resolvePresentationErrorVariant(error('verifier_submission_failed', 502))
    ).toBe('rejected')
    expect(
      resolvePresentationErrorVariant(error('invalid_credential_selection', 400))
    ).toBe('invalid_request')
    expect(
      resolvePresentationErrorVariant(error('transaction_data_not_acknowledged', 400))
    ).toBe('invalid_request')
  })

  it('maps user-facing rejection and expiry codes', () => {
    expect(resolvePresentationErrorVariant(error('user_rejected'))).toBe('rejected')
    expect(
      resolvePresentationErrorVariant(error('invalid_presentation_request', 404))
    ).toBe('expired')
  })

  it('falls back to generic for unknown codes', () => {
    expect(resolvePresentationErrorVariant(error('internal_error', 500))).toBe('generic')
    expect(resolvePresentationErrorVariant(error('unauthorized', 401))).toBe('generic')
  })
})

describe('presentationErrorContent', () => {
  it('returns variant-specific titles and messages', () => {
    const network = presentationErrorContent(
      'network',
      error('request_uri_fetch_failed', 502)
    )
    expect(network.title).toBe('Connection problem')

    const proof = presentationErrorContent(
      'proof_generation',
      error('presentation_build_failed', 500)
    )
    expect(proof.title).toBe('Could not create proof')
  })

  it('includes backend error_description as guidance when present', () => {
    const content = presentationErrorContent('invalid_request', {
      code: 'invalid_request',
      message: 'bad',
      error_description: 'selected_credentials missing when accepted is true.',
    })
    expect(content.guidance).toBe('selected_credentials missing when accepted is true.')
  })
})

describe('presentationErrorActions', () => {
  it('enables retry for network and proof generation failures', () => {
    expect(presentationErrorActions('network')).toEqual({
      canRetry: true,
      canStartOver: true,
    })
    expect(presentationErrorActions('proof_generation')).toEqual({
      canRetry: true,
      canStartOver: true,
    })
  })

  it('disables retry for terminal verifier outcomes', () => {
    expect(presentationErrorActions('rejected')).toEqual({
      canRetry: false,
      canStartOver: false,
    })
    expect(presentationErrorActions('unsupported_credential')).toEqual({
      canRetry: false,
      canStartOver: false,
    })
  })
})
