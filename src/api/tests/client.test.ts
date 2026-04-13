// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGet, apiPost } from '../client'

// ---------------------------------------------------------------------------
// Mock the auth module so tests are not coupled to key-generation timing
// ---------------------------------------------------------------------------

vi.mock('../../auth/tenant', () => ({
  getAuthorizationHeader: vi.fn(async () => 'Bearer mock.jwt.token'),
}))

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

function mockFetch(
  partial: { ok: boolean; status: number; body?: unknown }
) {
  return vi.fn(async () => ({
    ok: partial.ok,
    status: partial.status,
    json: async () => partial.body ?? {},
  }))
}

// ---------------------------------------------------------------------------
// apiGet
// ---------------------------------------------------------------------------

describe('apiGet', () => {
  it('sends a GET request with the Authorization header', async () => {
    const fetchMock = mockFetch({ ok: true, status: 200, body: { value: 42 } })
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await apiGet('/some/resource')

    expect(fetchMock).toHaveBeenCalledWith('http://api.test/some/resource', {
      headers: { Authorization: 'Bearer mock.jwt.token' },
    })
  })

  it('returns the parsed JSON body on success', async () => {
    const fetchMock = mockFetch({ ok: true, status: 200, body: { credentials: [] } })
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const result = await apiGet<{ credentials: unknown[] }>('/credentials')
    expect(result).toEqual({ credentials: [] })
  })

  it('throws on a non-ok response', async () => {
    const fetchMock = mockFetch({ ok: false, status: 401 })
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await expect(apiGet('/protected')).rejects.toThrow('Request failed with 401')
  })
})

// ---------------------------------------------------------------------------
// apiPost
// ---------------------------------------------------------------------------

describe('apiPost', () => {
  it('sends a POST request with Content-Type and Authorization headers', async () => {
    const fetchMock = mockFetch({ ok: true, status: 201, body: { session_id: 'abc' } })
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await apiPost('/issuance/start', { offer: 'openid-credential-offer://...' })

    expect(fetchMock).toHaveBeenCalledWith('http://api.test/issuance/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock.jwt.token',
      },
      body: JSON.stringify({ offer: 'openid-credential-offer://...' }),
    })
  })

  it('returns the parsed JSON body on success', async () => {
    const fetchMock = mockFetch({ ok: true, status: 201, body: { session_id: 'ses_1' } })
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const result = await apiPost<{ session_id: string }, { offer: string }>(
      '/issuance/start',
      { offer: 'x' }
    )
    expect(result).toEqual({ session_id: 'ses_1' })
  })

  it('returns undefined for 204 No Content', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 204, json: async () => ({}) }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const result = await apiPost<undefined, object>('/issuance/cancel', {})
    expect(result).toBeUndefined()
  })

  it('throws on a non-ok response', async () => {
    const fetchMock = mockFetch({ ok: false, status: 400 })
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await expect(apiPost('/issuance/start', { offer: 'x' })).rejects.toThrow(
      'Request failed with 400'
    )
  })
})