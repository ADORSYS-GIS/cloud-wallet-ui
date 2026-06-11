import { describe, expect, it } from 'vitest'
import { ContractError } from '../../validation'
import {
  validatePresentationConsentResponse,
  validateStartPresentationResponse,
} from '../validation'

const validStartResponse = {
  session_id: 'prs_7f3kQ2mXpLnVwRtYbHsD9cAeUjZo1Ni',
  expires_at: '2026-04-08T14:35:00Z',
  flow: 'cross_device',
  verifier: {
    name: 'Example Relying Party',
    logo_uri: 'https://verifier.example.eu/assets/logo.svg',
    policy_uri: 'https://verifier.example.eu/privacy',
    verified: true,
    verification_method: 'x509',
  },
  purpose: 'Age verification for access to restricted content.',
  credential_matches: [
    {
      query_id: 'pid_request',
      required: true,
      candidates: [
        {
          credential_id: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
          display: {
            name: 'EU Personal ID',
            issuer_name: 'Example EU Identity Authority',
            credential_type: 'dc+sd-jwt',
          },
          requested_claims: [
            { path: ['family_name'], display_name: 'Family name' },
            { path: ['given_name'], display_name: 'Given name' },
          ],
        },
      ],
    },
  ],
  transaction_data: null,
  requires_consent: true,
}

describe('validateStartPresentationResponse', () => {
  it('accepts a valid OpenAPI response', () => {
    const result = validateStartPresentationResponse(validStartResponse)
    expect(result.session_id).toBe('prs_7f3kQ2mXpLnVwRtYbHsD9cAeUjZo1Ni')
    expect(result.verifier.name).toBe('Example Relying Party')
    expect(result.credential_matches).toHaveLength(1)
    expect(
      result.credential_matches[0].candidates[0].requested_claims[0].display_name
    ).toBe('Family name')
  })

  it('accepts an empty credential_matches array', () => {
    const result = validateStartPresentationResponse({
      ...validStartResponse,
      credential_matches: [],
    })
    expect(result.credential_matches).toEqual([])
  })

  it('throws ContractError when session_id is missing', () => {
    expect(() =>
      validateStartPresentationResponse({
        ...validStartResponse,
        session_id: undefined,
      })
    ).toThrow(ContractError)
  })

  it('throws ContractError when verifier.name is missing', () => {
    expect(() =>
      validateStartPresentationResponse({
        ...validStartResponse,
        verifier: { verified: true },
      })
    ).toThrow(ContractError)
  })

  it('throws ContractError when flow is invalid', () => {
    expect(() =>
      validateStartPresentationResponse({
        ...validStartResponse,
        flow: 'invalid',
      })
    ).toThrow(ContractError)
  })
})

describe('validatePresentationConsentResponse', () => {
  it('accepts a completed response', () => {
    const result = validatePresentationConsentResponse({
      status: 'completed',
      redirect_uri: null,
      verifier_response: {
        redirect_uri: 'https://verifier.example.eu/success',
      },
    })
    expect(result.status).toBe('completed')
  })

  it('accepts a rejected response', () => {
    const result = validatePresentationConsentResponse({
      status: 'rejected',
      redirect_uri: null,
      verifier_response: null,
    })
    expect(result.status).toBe('rejected')
  })
})
