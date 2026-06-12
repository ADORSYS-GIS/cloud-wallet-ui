import { describe, expect, it } from 'vitest'
import { ContractError } from '../../validation'
import { validateStartPresentationResponse } from '../validation'

const validResponse = {
  session_id: 'prs_7f3kQ2mXpLnVwRtYbHsD9cAeUjZo1Ni',
  expires_at: '2026-04-08T14:35:00Z',
  flow: 'cross_device',
  verifier: {
    name: 'Keycloak-demo',
    logo_uri: 'https://verifier.example/logo.png',
    verified: true,
    verification_method: 'x509_san_dns',
  },
  purpose: 'Age verification',
  credential_matches: [
    {
      query_id: 'pid_request',
      required: true,
      candidates: [
        {
          credential_id: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
          display: {
            name: 'Identity Credential',
            issuer_name: 'Keycloak-demo Solution Adorsys',
            credential_type: 'eu.europa.ec.eudi.pid.1',
            logo: {
              uri: 'https://issuer.example/logo.png',
              alt_text: 'Issuer logo',
            },
          },
          requested_claims: [{ path: ['given_name'], display_name: 'Given name' }],
        },
      ],
    },
  ],
  requires_consent: true,
}

describe('validateStartPresentationResponse', () => {
  it('accepts a valid response', () => {
    const result = validateStartPresentationResponse(validResponse)
    expect(result.session_id).toBe('prs_7f3kQ2mXpLnVwRtYbHsD9cAeUjZo1Ni')
    expect(result.verifier.name).toBe('Keycloak-demo')
    expect(result.credential_matches).toHaveLength(1)
    expect(result.credential_matches[0].candidates[0].display.name).toBe(
      'Identity Credential'
    )
    expect(result.credential_matches[0].candidates[0].display.issuer_name).toBe(
      'Keycloak-demo Solution Adorsys'
    )
  })

  it('accepts an empty credential_matches array', () => {
    const result = validateStartPresentationResponse({
      ...validResponse,
      credential_matches: [],
    })
    expect(result.credential_matches).toEqual([])
  })

  it('throws ContractError when session_id is missing', () => {
    expect(() =>
      validateStartPresentationResponse({
        ...validResponse,
        session_id: undefined,
      })
    ).toThrow(ContractError)
  })

  it('throws ContractError when verifier.name is missing', () => {
    expect(() =>
      validateStartPresentationResponse({
        ...validResponse,
        verifier: { verified: true },
      })
    ).toThrow(ContractError)
  })

  it('throws ContractError when flow is invalid', () => {
    expect(() =>
      validateStartPresentationResponse({
        ...validResponse,
        flow: 'invalid',
      })
    ).toThrow(ContractError)
  })

  it('accepts OpenAPI verification_method values', () => {
    const result = validateStartPresentationResponse({
      ...validResponse,
      verifier: {
        ...validResponse.verifier,
        verification_method: 'decentralized_identifier',
      },
    })
    expect(result.verifier.verification_method).toBe('decentralized_identifier')
  })

  it('throws ContractError for unknown verification_method', () => {
    expect(() =>
      validateStartPresentationResponse({
        ...validResponse,
        verifier: {
          ...validResponse.verifier,
          verification_method: 'x509',
        },
      })
    ).toThrow(ContractError)
  })

  it('throws ContractError when candidate credential_id is not a UUID', () => {
    expect(() =>
      validateStartPresentationResponse({
        ...validResponse,
        credential_matches: [
          {
            query_id: 'pid_request',
            required: true,
            candidates: [
              {
                credential_id: 'cred-1',
                display: {
                  name: 'Identity Credential',
                  issuer_name: 'Issuer',
                  credential_type: 'eu.europa.ec.eudi.pid.1',
                },
                requested_claims: [],
              },
            ],
          },
        ],
      })
    ).toThrow(ContractError)
  })

  it('throws ContractError when response is null', () => {
    expect(() => validateStartPresentationResponse(null)).toThrow(ContractError)
  })
})
