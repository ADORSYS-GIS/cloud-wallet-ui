import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { startIssuanceSession } from '../issuance.api'
import type { CredentialOfferResolutionResponse } from '../../types/issuance.types'

type MockFetchResponse = {
  ok: boolean
  status: number
  headers: { get: (name: string) => string | null }
  json: () => Promise<unknown>
}

function response(
  partial: Partial<MockFetchResponse> & Pick<MockFetchResponse, 'ok' | 'status'>
): MockFetchResponse {
  return {
    ok: partial.ok,
    status: partial.status,
    headers: partial.headers ?? {
      get: () => null,
    },
    json: partial.json ?? (async () => ({})),
  }
}

describe('startIssuanceSession', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('submits offer via POST /issuance/start', async () => {
    const fetchMock = vi.fn(async () =>
      response({
        ok: true,
        status: 201,
        json: async () =>
          ({
            session_id: 'ses_123',
            expires_at: '2026-04-08T14:35:00Z',
            issuer: {
              credential_issuer: 'https://issuer.example.com',
              display_name: 'Example Issuer',
              logo_uri: null,
            },
            credential_types: [
              {
                credential_configuration_id: 'my.credential.1',
                format: 'vc+sd-jwt',
                display: { name: 'My Credential' },
              },
            ],
            flow: 'pre_authorized_code',
            tx_code_required: false,
            tx_code: null,
          }) satisfies CredentialOfferResolutionResponse,
      })
    )
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const offer =
      'openid-credential-offer://?credential_offer_uri=' +
      encodeURIComponent('https://issuer.example.com/offer/123')
    const result = await startIssuanceSession(offer)
    expect(result.session_id).toBe('ses_123')
    expect(result.credential_types).toHaveLength(1)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenLastCalledWith('http://api.test/api/v1/issuance/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offer,
      }),
    })
  })

  it('throws API error without GET fallback', async () => {
    const fetchMock = vi.fn(async () =>
      response({
        ok: false,
        status: 400,
      })
    )
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await expect(
      startIssuanceSession(
        'openid-credential-offer://?credential_offer_uri=' +
          encodeURIComponent('https://issuer.example.com/credential-offer/abc')
      )
    ).rejects.toThrow('Request failed with 400')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps server error details in thrown error body', async () => {
    const fetchMock = vi.fn(async () =>
      response({
        ok: false,
        status: 502,
        headers: {
          get: (name: string) =>
            name.toLowerCase() === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({
          error: 'issuer_metadata_fetch_failed',
          error_description: 'Could not reach issuer metadata endpoint.',
        }),
      })
    )
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await expect(
      startIssuanceSession(
        'openid-credential-offer://?credential_offer_uri=' +
          encodeURIComponent('https://issuer.example.com/credential-offer/abc')
      )
    ).rejects.toMatchObject({
      status: 502,
      body: {
        error: 'issuer_metadata_fetch_failed',
      },
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
