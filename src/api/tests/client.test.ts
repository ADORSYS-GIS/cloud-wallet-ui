import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiGet, apiPost } from '../client'

vi.mock('../../auth/authService', () => ({
  getBearerToken: vi.fn(async () => 'mock.jwt.token'),
}))

type MockResponse = {
  ok: boolean
  status: number
  json: () => Promise<unknown>
  clone: () => { text: () => Promise<string> }
}

function makeResponse(
  partial: Partial<MockResponse> & Pick<MockResponse, 'ok' | 'status'>
): MockResponse {
  const json = partial.json ?? (async () => ({}))
  return {
    ok: partial.ok,
    status: partial.status,
    json,
    clone() {
      return {
        async text() {
          try {
            const data = await json()
            if (typeof data === 'string') return data
            return JSON.stringify(data)
          } catch {
            return ''
          }
        },
      }
    },
  }
}

describe('api client', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('apiGet returns JSON for successful responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeResponse({
          ok: true,
          status: 200,
          json: async () => ({ ok: true }),
        })
      ) as unknown as typeof fetch
    )

    await expect(apiGet<{ ok: boolean }>('/ping')).resolves.toEqual({ ok: true })
  })

  it('apiGet throws ApiError with fallback message for non-JSON error payloads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeResponse({
          ok: false,
          status: 404,
          json: async () => {
            throw new Error('not json')
          },
        })
      ) as unknown as typeof fetch
    )

    await expect(apiGet('/missing')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'GET /missing failed with 404',
    })
  })

  it('apiPost returns undefined for 204 No Content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeResponse({
          ok: true,
          status: 204,
          json: async () => ({}),
        })
      ) as unknown as typeof fetch
    )

    await expect(
      apiPost<undefined, { x: number }>('/sessions/cancel', { x: 1 })
    ).resolves.toBe(undefined)
  })

  it('apiPost throws ApiError with parsed error details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeResponse({
          ok: false,
          status: 500,
          json: async () => ({
            error: 'internal_error',
            error_description: 'Server exploded',
          }),
        })
      ) as unknown as typeof fetch
    )

    await expect(apiPost('/explode', { a: 1 })).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      errorCode: 'internal_error',
      errorDescription: 'Server exploded',
      message: 'Server exploded',
    })
  })

  it('maps AbortError to timeout ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('Request aborted', 'AbortError')
      }) as unknown as typeof fetch
    )

    await expect(apiGet('/slow')).rejects.toBeInstanceOf(ApiError)
    await expect(apiGet('/slow')).rejects.toMatchObject({ status: 408 })
  })

  it('rethrows non-timeout fetch errors unchanged', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }) as unknown as typeof fetch
    )

    await expect(apiGet('/network')).rejects.toThrow('network down')
  })

  it('apiPost maps 502 with OpenAPI issuer_metadata_fetch_failed and no description', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeResponse({
          ok: false,
          status: 502,
          json: async () => ({ error: 'issuer_metadata_fetch_failed' }),
        })
      ) as unknown as typeof fetch
    )

    await expect(apiPost('/issuance/start', { offer: 'x' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
      errorCode: 'issuer_metadata_fetch_failed',
      errorDescription: null,
      message:
        'Could not reach the credential issuer metadata endpoint (502 Bad Gateway).',
    })
  })

  it('apiPost maps 502 with auth_server_metadata_fetch_failed and no description', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeResponse({
          ok: false,
          status: 502,
          json: async () => ({ error: 'auth_server_metadata_fetch_failed' }),
        })
      ) as unknown as typeof fetch
    )

    await expect(apiPost('/issuance/start', { offer: 'x' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
      errorCode: 'auth_server_metadata_fetch_failed',
      errorDescription: null,
      message:
        'Could not reach the authorization server metadata endpoint (502 Bad Gateway).',
    })
  })

  it('apiPost prefers error_description on 502 when present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeResponse({
          ok: false,
          status: 502,
          json: async () => ({
            error: 'issuer_metadata_fetch_failed',
            error_description:
              'Could not reach https://issuer.example.eu/.well-known/openid-credential-issuer',
          }),
        })
      ) as unknown as typeof fetch
    )

    await expect(apiPost('/issuance/start', { offer: 'x' })).rejects.toMatchObject({
      status: 502,
      errorCode: 'issuer_metadata_fetch_failed',
      errorDescription:
        'Could not reach https://issuer.example.eu/.well-known/openid-credential-issuer',
      message:
        'Could not reach https://issuer.example.eu/.well-known/openid-credential-issuer',
    })
  })

  it('apiPost uses gateway-specific fallback when 502 body has no ErrorResponse fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeResponse({
          ok: false,
          status: 502,
          json: async () => ({}),
        })
      ) as unknown as typeof fetch
    )

    await expect(apiPost('/issuance/start', { offer: 'x' })).rejects.toMatchObject({
      status: 502,
      errorCode: null,
      errorDescription: null,
      message:
        'The wallet backend could not reach the credential issuer or authorization server (POST /issuance/start, 502). Please try again.',
    })
  })

  it('uses fallback api error message when error payload is not an object', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeResponse({
          ok: false,
          status: 400,
          json: async () => 'plain-string-error',
        })
      ) as unknown as typeof fetch
    )

    await expect(apiPost('/plain-error', { x: 1 })).rejects.toMatchObject({
      status: 400,
      errorCode: null,
      errorDescription: null,
      message: 'POST /plain-error failed with 400',
    })
  })

  it('when VITE_DEBUG_API is true, logs requests and redacts Authorization', async () => {
    vi.stubEnv('VITE_DEBUG_API', 'true')
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeResponse({
          ok: true,
          status: 200,
          json: async () => ({ x: 1 }),
        })
      ) as unknown as typeof fetch
    )

    await apiGet('/safe')

    expect(debugSpy).toHaveBeenCalled()
    const combined = debugSpy.mock.calls.map((c) => JSON.stringify(c)).join('\n')
    expect(combined).toContain('Bearer [REDACTED]')
    expect(combined).not.toContain('mock.jwt.token')
    expect(combined).toContain('[API]')
  })
})
