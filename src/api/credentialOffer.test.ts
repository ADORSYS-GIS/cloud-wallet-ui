import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { resolveCredentialOfferUri } from './credentialOffer'
import type { CredentialOfferResolutionResponse } from '../types/credentialOffer'

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

describe('resolveCredentialOfferUri', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('submits via POST without fallback when OK', async () => {
    const fetchMock = vi.fn(async () =>
      response({
        ok: true,
        status: 200,
        json: async () =>
          ({
            credentialTypes: ['MyCredential'],
          }) satisfies CredentialOfferResolutionResponse,
      })
    )
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const result = await resolveCredentialOfferUri('https://issuer.example.com/offer/123')
    expect(result).toEqual({ credentialTypes: ['MyCredential'] })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenLastCalledWith('http://api.test/credential-offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential_offer_uri: 'https://issuer.example.com/offer/123',
      }),
    })
  })

  it('falls back to GET only on 405', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockImplementationOnce(async () =>
        response({
          ok: false,
          status: 405,
        })
      )
      .mockImplementationOnce(async () =>
        response({
          ok: true,
          status: 200,
          json: async () =>
            ({
              credentialTypes: ['MyCredential'],
            }) satisfies CredentialOfferResolutionResponse,
        })
      )
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const result = await resolveCredentialOfferUri(
      'https://issuer.example.com/credential-offer/abc'
    )
    expect(result).toEqual({ credentialTypes: ['MyCredential'] })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://api.test/credential-offer')
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'http://api.test/credential-offer?credential_offer_uri=' +
        encodeURIComponent('https://issuer.example.com/credential-offer/abc')
    )
  })

  it('does not fall back on 4xx other than 405', async () => {
    const fetchMock = vi.fn(async () =>
      response({
        ok: false,
        status: 400,
      })
    )
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await expect(
      resolveCredentialOfferUri('https://issuer.example.com/credential-offer/abc')
    ).rejects.toThrow('Request failed with 400')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
