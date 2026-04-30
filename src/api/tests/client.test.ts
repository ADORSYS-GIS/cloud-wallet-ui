import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiGet, apiPost } from '../client'

vi.mock('../../auth/authService', () => ({
  getBearerToken: vi.fn(async () => 'mock.jwt.token'),
}))

type MockResponse = {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

function makeResponse(
  partial: Partial<MockResponse> & Pick<MockResponse, 'ok' | 'status'>
): MockResponse {
  return {
    ok: partial.ok,
    status: partial.status,
    json: partial.json ?? (async () => ({})),
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

    await expect(apiPost<undefined, { x: number }>('/sessions/cancel', { x: 1 })).resolves.toBe(
      undefined
    )
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
})
