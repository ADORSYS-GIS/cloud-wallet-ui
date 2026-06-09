import { describe, expect, it } from 'vitest'
import { ContractError } from '../../validation'
import { validateStartPresentationResponse } from '../validation'

const validRequest = {
  client_id: 'https://verifier.example',
  nonce: 'nonce-123',
  response_type: 'vp_token',
  response_mode: 'direct_post',
  dcql_query: {
    credentials: [{ id: 'identity', format: 'dc+sd-jwt' }],
  },
}

const validResponse = {
  request: validRequest,
  verifier: {
    client_id: 'https://verifier.example',
    name: 'Keycloak-demo',
    logo_uri: 'https://verifier.example/logo.png',
  },
  matching_credentials: [
    {
      credentialId: 'cred-1',
      queryId: 'identity',
      format: 'dc+sd-jwt',
      display: {
        name: 'Identity Credential',
        issuer_name: 'Keycloak-demo Solution Adorsys',
        logo: {
          uri: 'https://issuer.example/logo.png',
          alt_text: 'Issuer logo',
        },
      },
    },
  ],
}

describe('validateStartPresentationResponse', () => {
  it('accepts a valid response', () => {
    const result = validateStartPresentationResponse(validResponse)
    expect(result.request.nonce).toBe('nonce-123')
    expect(result.verifier.name).toBe('Keycloak-demo')
    expect(result.matching_credentials).toHaveLength(1)
    expect(result.matching_credentials[0].display?.name).toBe('Identity Credential')
    expect(result.matching_credentials[0].display?.issuer_name).toBe(
      'Keycloak-demo Solution Adorsys'
    )
  })

  it('accepts scope instead of dcql_query', () => {
    const result = validateStartPresentationResponse({
      ...validResponse,
      request: {
        client_id: validRequest.client_id,
        nonce: validRequest.nonce,
        response_type: validRequest.response_type,
        response_mode: validRequest.response_mode,
        scope: 'openid',
      },
    })
    expect(result.request.scope).toBe('openid')
  })

  it('accepts an empty matching_credentials array', () => {
    const result = validateStartPresentationResponse({
      ...validResponse,
      matching_credentials: [],
    })
    expect(result.matching_credentials).toEqual([])
  })

  it('throws ContractError when request.nonce is missing', () => {
    expect(() =>
      validateStartPresentationResponse({
        ...validResponse,
        request: {
          client_id: validRequest.client_id,
          response_type: validRequest.response_type,
          response_mode: validRequest.response_mode,
          dcql_query: validRequest.dcql_query,
        },
      })
    ).toThrow(ContractError)
  })

  it('throws ContractError when request has neither scope nor dcql_query', () => {
    expect(() =>
      validateStartPresentationResponse({
        ...validResponse,
        request: {
          client_id: validRequest.client_id,
          nonce: validRequest.nonce,
          response_type: validRequest.response_type,
          response_mode: validRequest.response_mode,
        },
      })
    ).toThrow(ContractError)
  })

  it('throws ContractError when verifier.client_id is missing', () => {
    expect(() =>
      validateStartPresentationResponse({
        ...validResponse,
        verifier: { name: 'Verifier' },
      })
    ).toThrow(ContractError)
  })

  it('throws ContractError when matching credential is missing credentialId', () => {
    expect(() =>
      validateStartPresentationResponse({
        ...validResponse,
        matching_credentials: [{ queryId: 'identity', format: 'dc+sd-jwt' }],
      })
    ).toThrow(ContractError)
  })

  it('throws ContractError when response is null', () => {
    expect(() => validateStartPresentationResponse(null)).toThrow(ContractError)
  })
})
