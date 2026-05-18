import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteCredential, getCredentials } from '../credentials'
import { ApiError } from '../client'
vi.mock('../../auth/authService', () => ({
  getBearerToken: vi.fn(async () => 'mock.jwt.token'),
}))

const validCredential = {
  id: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
  credential_configuration_id: 'eu.europa.ec.eudi.pid.1',
  format: 'dc+sd-jwt',
  issuer: 'https://issuer.example.eu',
  status: 'active',
  issued_at: '2026-04-08T14:35:00Z',
  expires_at: '2027-04-08T14:35:00Z',
  claims: { given_name: 'Jane', family_name: 'Doe' },
}

const validListResponse = { credentials: [validCredential] }
const emptyListResponse = { credentials: [] }

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

/** Extract the URL that was passed to fetch in the Nth call (0-indexed). */
function calledUrl(fetchMock: ReturnType<typeof vi.fn>, callIndex = 0): string {
  return (fetchMock.mock.calls[callIndex] as [string, unknown])[0]
}

function calledInit(fetchMock: ReturnType<typeof vi.fn>, callIndex = 0): RequestInit {
  return (fetchMock.mock.calls[callIndex] as [string, RequestInit])[1]
}

describe('getCredentials — no filters', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('calls GET /credentials with no query string when called without arguments', async () => {
    const fetchMock = vi.fn(async () =>
      makeResponse({ ok: true, status: 200, json: async () => validListResponse })
    )
    vi.stubGlobal('fetch', fetchMock)

    await getCredentials()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(calledUrl(fetchMock)).toBe('http://api.test/api/v1/credentials')
  })

  it('calls GET /credentials with no query string when called with an empty filters object', async () => {
    const fetchMock = vi.fn(async () =>
      makeResponse({ ok: true, status: 200, json: async () => validListResponse })
    )
    vi.stubGlobal('fetch', fetchMock)

    await getCredentials({})

    expect(calledUrl(fetchMock)).toBe('http://api.test/api/v1/credentials')
  })

  it('returns validated credential list on success', async () => {
    const fetchMock = vi.fn(async () =>
      makeResponse({ ok: true, status: 200, json: async () => validListResponse })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await getCredentials()

    expect(result.credentials).toHaveLength(1)
    expect(result.credentials[0].id).toBe('c3d4e5f6-7890-abcd-ef12-3456789abcde')
  })

  it('returns empty credentials list when server responds with empty array', async () => {
    const fetchMock = vi.fn(async () =>
      makeResponse({ ok: true, status: 200, json: async () => emptyListResponse })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await getCredentials()

    expect(result.credentials).toEqual([])
  })

  it('throws ApiError on non-2xx response', async () => {
    const fetchMock = vi.fn(async () =>
      makeResponse({
        ok: false,
        status: 401,
        json: async () => ({ error: 'unauthorized', error_description: 'Bad token' }),
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getCredentials()).rejects.toBeInstanceOf(ApiError)
  })
})

describe('getCredentials — status filter', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('appends status=active to the URL', async () => {
    const fetchMock = vi.fn(async () =>
      makeResponse({ ok: true, status: 200, json: async () => validListResponse })
    )
    vi.stubGlobal('fetch', fetchMock)

    await getCredentials({ status: 'active' })

    expect(calledUrl(fetchMock)).toBe('http://api.test/api/v1/credentials?status=active')
  })

  it('appends status=expired to the URL', async () => {
    const fetchMock = vi.fn(async () =>
      makeResponse({ ok: true, status: 200, json: async () => emptyListResponse })
    )
    vi.stubGlobal('fetch', fetchMock)

    await getCredentials({ status: 'expired' })

    expect(calledUrl(fetchMock)).toBe('http://api.test/api/v1/credentials?status=expired')
  })
})

describe('getCredentials — format filter', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('appends format=dc%2Bsd-jwt to the URL (URL-encoded)', async () => {
    const fetchMock = vi.fn(async () =>
      makeResponse({ ok: true, status: 200, json: async () => validListResponse })
    )
    vi.stubGlobal('fetch', fetchMock)

    await getCredentials({ format: 'dc+sd-jwt' })

    const url = calledUrl(fetchMock)
    expect(url).toContain('format=dc%2Bsd-jwt')
  })
})

describe('getCredentials — issuer filter', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('URL-encodes the issuer URI', async () => {
    const fetchMock = vi.fn(async () =>
      makeResponse({ ok: true, status: 200, json: async () => validListResponse })
    )
    vi.stubGlobal('fetch', fetchMock)

    await getCredentials({ issuer: 'https://issuer.example.eu' })

    const url = calledUrl(fetchMock)
    expect(url).toContain(`issuer=${encodeURIComponent('https://issuer.example.eu')}`)
  })
})

describe('getCredentials — credential_types filter', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('appends a single credential_types param', async () => {
    const fetchMock = vi.fn(async () =>
      makeResponse({ ok: true, status: 200, json: async () => validListResponse })
    )
    vi.stubGlobal('fetch', fetchMock)

    await getCredentials({ credential_types: ['eu.europa.ec.eudi.pid.1'] })

    const url = calledUrl(fetchMock)
    expect(url).toContain('credential_types=eu.europa.ec.eudi.pid.1')
    // Only one occurrence
    expect(url.split('credential_types=').length - 1).toBe(1)
  })

  it('appends multiple credential_types as repeated params', async () => {
    const fetchMock = vi.fn(async () =>
      makeResponse({ ok: true, status: 200, json: async () => validListResponse })
    )
    vi.stubGlobal('fetch', fetchMock)

    await getCredentials({
      credential_types: ['eu.europa.ec.eudi.pid.1', 'eu.europa.ec.eudi.lpid.1'],
    })

    const url = calledUrl(fetchMock)
    expect(url).toContain('credential_types=eu.europa.ec.eudi.pid.1')
    expect(url).toContain('credential_types=eu.europa.ec.eudi.lpid.1')
    expect(url.split('credential_types=').length - 1).toBe(2)
  })

  it('omits credential_types param when array is empty', async () => {
    const fetchMock = vi.fn(async () =>
      makeResponse({ ok: true, status: 200, json: async () => emptyListResponse })
    )
    vi.stubGlobal('fetch', fetchMock)

    await getCredentials({ credential_types: [] })

    expect(calledUrl(fetchMock)).toBe('http://api.test/api/v1/credentials')
  })
})

describe('getCredentials — combined filters', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('combines all four filter types into a single query string', async () => {
    const fetchMock = vi.fn(async () =>
      makeResponse({ ok: true, status: 200, json: async () => validListResponse })
    )
    vi.stubGlobal('fetch', fetchMock)

    await getCredentials({
      credential_types: ['eu.europa.ec.eudi.pid.1'],
      status: 'active',
      format: 'dc+sd-jwt',
      issuer: 'https://issuer.example.eu',
    })

    const url = calledUrl(fetchMock)
    expect(url).toContain('credential_types=eu.europa.ec.eudi.pid.1')
    expect(url).toContain('status=active')
    expect(url).toContain('format=dc%2Bsd-jwt')
    expect(url).toContain(`issuer=${encodeURIComponent('https://issuer.example.eu')}`)
  })

  it('omits undefined filter fields from the query string', async () => {
    const fetchMock = vi.fn(async () =>
      makeResponse({ ok: true, status: 200, json: async () => validListResponse })
    )
    vi.stubGlobal('fetch', fetchMock)

    await getCredentials({ status: 'active' })

    const url = calledUrl(fetchMock)
    expect(url).not.toContain('credential_types')
    expect(url).not.toContain('format')
    expect(url).not.toContain('issuer')
  })
})

describe('deleteCredential', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('calls DELETE /credentials/{id} and resolves on 204', async () => {
    const credentialId = 'c3d4e5f6-7890-abcd-ef12-3456789abcde'
    const fetchMock = vi.fn(async () =>
      makeResponse({ ok: true, status: 204, json: async () => ({}) })
    )
    vi.stubGlobal('fetch', fetchMock)

    await deleteCredential(credentialId)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(calledUrl(fetchMock)).toBe(
      `http://api.test/api/v1/credentials/${encodeURIComponent(credentialId)}`
    )
    expect(calledInit(fetchMock).method).toBe('DELETE')
  })

  it('throws ApiError on 403 forbidden', async () => {
    const fetchMock = vi.fn(async () =>
      makeResponse({
        ok: false,
        status: 403,
        json: async () => ({
          error: 'forbidden',
          error_description: 'You cannot delete this credential.',
        }),
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(deleteCredential('cred-forbidden')).rejects.toBeInstanceOf(ApiError)
  })

  it('throws ApiError on 404 not found', async () => {
    const fetchMock = vi.fn(async () =>
      makeResponse({
        ok: false,
        status: 404,
        json: async () => ({
          error: 'credential_not_found',
          error_description:
            'No credential with that ID exists for the authenticated tenant.',
        }),
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(deleteCredential('missing-id')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      errorCode: 'credential_not_found',
    })
  })
})
