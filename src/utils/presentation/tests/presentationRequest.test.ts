import { describe, expect, it } from 'vitest'
import {
  parsePresentationRequestParams,
  presentationRequestPath,
} from '../presentationRequest'

const validParams = new URLSearchParams({
  client_id: 'https://verifier.example',
  request_uri: 'https://verifier.example/request',
  response_type: 'vp_token',
  nonce: 'nonce-123',
  scope: 'openid',
})

describe('parsePresentationRequestParams', () => {
  it('accepts a valid request_uri flow', () => {
    const result = parsePresentationRequestParams(validParams)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.authorization.client_id).toBe('https://verifier.example')
      expect(result.authorization.request_uri).toBe('https://verifier.example/request')
      expect(result.authorization.scope).toBe('openid')
    }
  })

  it('accepts a direct JWT request parameter', () => {
    const params = new URLSearchParams({
      client_id: 'verifier-client',
      request: 'eyJhbGciOiJFUzI1NiJ9.mock',
      response_type: 'vp_token id_token',
      nonce: 'nonce-abc',
      dcql_query: '{"credentials":[]}',
    })
    const result = parsePresentationRequestParams(params)
    expect(result.ok).toBe(true)
  })

  it('accepts a minimal JAR request_uri (params resolved by backend)', () => {
    const params = new URLSearchParams({
      client_id: 'x509_san_dns:verifier.example',
      request_uri: 'https://verifier.example/oid4vp-auth/request.jwt/q845ZZKf',
    })
    const result = parsePresentationRequestParams(params)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.authorization.response_type).toBeUndefined()
      expect(result.authorization.nonce).toBeUndefined()
    }
  })

  it('rejects missing client_id', () => {
    const params = new URLSearchParams(validParams)
    params.delete('client_id')
    const result = parsePresentationRequestParams(params)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_request')
    }
  })

  it('rejects invalid request_uri format', () => {
    const params = new URLSearchParams(validParams)
    params.set('request_uri', 'not-a-valid-uri')
    const result = parsePresentationRequestParams(params)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('request_uri')
    }
  })

  it('rejects http request_uri', () => {
    const params = new URLSearchParams(validParams)
    params.set('request_uri', 'http://verifier.example/request')
    const result = parsePresentationRequestParams(params)
    expect(result.ok).toBe(false)
  })

  it('rejects unsupported response_mode', () => {
    const params = new URLSearchParams(validParams)
    params.set('response_mode', 'unsupported_mode')
    const result = parsePresentationRequestParams(params)
    expect(result.ok).toBe(false)
  })

  it('rejects invalid client_metadata_uri format', () => {
    const params = new URLSearchParams(validParams)
    params.set('client_metadata_uri', 'ftp://bad.example/meta')
    const result = parsePresentationRequestParams(params)
    expect(result.ok).toBe(false)
  })

  it('builds an internal /present route from authorization params', () => {
    expect(
      presentationRequestPath({
        client_id: 'verifier',
        request_uri: 'https://verifier.example/request',
        response_type: 'vp_token',
        nonce: 'n1',
        scope: 'openid',
      })
    ).toContain('/present?')
  })
})
