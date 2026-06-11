import { describe, expect, it } from 'vitest'
import { ContractError } from '../../validation'
import {
  validatePresentationConsentResponse,
  validateStartPresentationResponse,
} from '../validation'

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
      displayName: 'Identity Credential',
    },
  ],
}

describe('validatePresentationConsentResponse', () => {
  const validCompletedCrossDevice = {
    status: 'completed',
    redirect_uri: null,
    verifier_response: { redirect_uri: 'https://verifier.example.eu/success' },
  }

  const validCompletedSameDevice = {
    status: 'completed',
    redirect_uri: 'https://verifier.example.eu/callback#vp_token=abc',
    verifier_response: null,
  }

  const validRejected = {
    status: 'rejected',
    redirect_uri: null,
    verifier_response: null,
  }

  it('accepts completed cross-device response', () => {
    expect(validatePresentationConsentResponse(validCompletedCrossDevice)).toEqual(
      validCompletedCrossDevice
    )
  })

  it('accepts completed same-device response', () => {
    expect(validatePresentationConsentResponse(validCompletedSameDevice)).toEqual(
      validCompletedSameDevice
    )
  })

  it('accepts rejected response', () => {
    expect(validatePresentationConsentResponse(validRejected)).toEqual(validRejected)
  })

  it('throws ContractError when status is missing', () => {
    expect(() =>
      validatePresentationConsentResponse({
        redirect_uri: null,
        verifier_response: null,
      })
    ).toThrow(ContractError)
  })

  it('throws ContractError for unknown status', () => {
    expect(() =>
      validatePresentationConsentResponse({
        status: 'pending',
        redirect_uri: null,
        verifier_response: null,
      })
    ).toThrow(ContractError)
  })

  it('throws ContractError when redirect_uri is not string or null', () => {
    expect(() =>
      validatePresentationConsentResponse({
        status: 'completed',
        redirect_uri: 42,
        verifier_response: null,
      })
    ).toThrow(ContractError)
  })
})

describe('validateStartPresentationResponse', () => {
  it('accepts a valid response', () => {
    const result = validateStartPresentationResponse(validResponse)
    expect(result.request.nonce).toBe('nonce-123')
    expect(result.verifier.name).toBe('Keycloak-demo')
    expect(result.matching_credentials).toHaveLength(1)
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
