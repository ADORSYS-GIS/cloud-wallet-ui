import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deletePresentationActivity,
  getPresentationActivity,
  getPresentationActivityById,
} from '../presentationActivity'

vi.mock('../../auth/authService', () => ({
  getBearerToken: vi.fn(async () => 'mock.jwt.token'),
}))

const ACTIVITY_ID = 'c3d4e5f6-7890-abcd-ef12-3456789abcde'

const validRecord = {
  id: ACTIVITY_ID,
  presented_at: '2026-06-01T10:00:00Z',
  verifier: {
    client_id: 'redirect_uri:https://verifier.example/cb',
    name: 'Example Verifier',
    logo_uri: null,
  },
  credential_types: ['eu.europa.ec.eudi.pid.1'],
  disclosed_claim_count: 3,
}

const validListResponse = {
  items: [validRecord],
  total: 1,
  page: 1,
  page_size: 20,
}

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

function calledUrl(fetchMock: ReturnType<typeof vi.fn>, callIndex = 0): string {
  return (fetchMock.mock.calls[callIndex] as [string, unknown])[0]
}

describe('getPresentationActivity', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('calls GET /presentation/activity with pagination and filters', async () => {
    const fetchMock = vi.fn(async () =>
      makeResponse({ ok: true, status: 200, json: async () => validListResponse })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await getPresentationActivity({
      page: 2,
      page_size: 10,
      from: '2026-01-01',
      to: '2026-06-30',
      verifier_name: 'Example',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = calledUrl(fetchMock)
    expect(url).toContain('/presentation/activity?')
    expect(url).toContain('page=2')
    expect(url).toContain('page_size=10')
    expect(url).toContain('from=2026-01-01')
    expect(url).toContain('to=2026-06-30')
    expect(url).toContain('verifier_name=Example')
    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe(ACTIVITY_ID)
  })
})

describe('getPresentationActivityById', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('calls GET /presentation/activity/{id}', async () => {
    const fetchMock = vi.fn(async () =>
      makeResponse({ ok: true, status: 200, json: async () => validRecord })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await getPresentationActivityById(ACTIVITY_ID)

    expect(calledUrl(fetchMock)).toBe(
      `http://api.test/api/v1/presentation/activity/${ACTIVITY_ID}`
    )
    expect(result.verifier.name).toBe('Example Verifier')
  })

  it('rejects invalid id before calling fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(getPresentationActivityById('not-a-uuid')).rejects.toThrow(
      'Invalid presentation activity id'
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('deletePresentationActivity', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('calls DELETE /presentation/activity/{id}', async () => {
    const fetchMock = vi.fn(async () =>
      makeResponse({ ok: true, status: 204, json: async () => ({}) })
    )
    vi.stubGlobal('fetch', fetchMock)

    await deletePresentationActivity(ACTIVITY_ID)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.method).toBe('DELETE')
    expect(calledUrl(fetchMock)).toBe(
      `http://api.test/api/v1/presentation/activity/${ACTIVITY_ID}`
    )
  })
})
