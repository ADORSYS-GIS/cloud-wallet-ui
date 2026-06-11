import { describe, expect, it } from 'vitest'
import { buildStartPresentationRequest } from '../buildStartRequest'

describe('buildStartPresentationRequest', () => {
  it('serializes authorization params into an openid4vp request URI', () => {
    const body = buildStartPresentationRequest(
      {
        client_id: 'https://verifier.example',
        request_uri: 'https://verifier.example/request',
        response_type: 'vp_token',
        nonce: 'nonce-123',
        scope: 'openid',
      },
      'https://wallet.example.com'
    )

    expect(body.request).toContain('openid4vp://?')
    expect(body.request).toContain('client_id=')
    expect(body.request).toContain('request_uri=')
    expect(body.origin).toBe('https://wallet.example.com')
  })
})
