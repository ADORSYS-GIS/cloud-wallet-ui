// @vitest-environment jsdom
import { renderHook, act, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CredentialsCacheProvider } from '../../state/credentialsCache.state'

const MOCK_TOKEN = 'mock.bearer.jwt'

vi.mock('../../auth/authService', () => ({
  getBearerToken: vi.fn(async () => MOCK_TOKEN),
}))

vi.mock('../../utils/env', () => ({
  getApiBaseUrl: vi.fn(() => 'http://api.test/api/v1'),
}))

import { getBearerToken } from '../../auth/authService'
const mockGetBearerToken = vi.mocked(getBearerToken)

function makeJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

const validCredentialListItem = {
  id: 'cred-1',
  display: {
    name: 'EU Personal ID',
    issuer_name: 'Example EU Identity Authority',
    credential_type: 'eu.europa.ec.eudi.pid.1',
  },
  issued_at: '2026-04-08T14:35:00Z',
}

const validList = { credentials: [validCredentialListItem] }

const validCredentialDetail = {
  id: 'cred-1',
  credential_configuration_id: 'eu.europa.ec.eudi.pid.1',
  format: 'dc+sd-jwt',
  issuer: 'https://issuer.example.eu',
  status: 'active',
  issued_at: '2026-04-08T14:35:00Z',
  expires_at: null,
  claims: { given_name: 'Jane' },
}

describe('useCredentials — request deduplication', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('sends exactly ONE request to /credentials on mount', async () => {
    const fetchMock = vi.fn(async () => makeJsonResponse(validList))
    vi.stubGlobal('fetch', fetchMock)

    const { useCredentials } = await import('../useCredentials')
    const { result } = renderHook(() => useCredentials(), {
      wrapper: CredentialsCacheProvider,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/credentials',
      expect.objectContaining({
        headers: { Authorization: `Bearer ${MOCK_TOKEN}` },
        signal: expect.any(AbortSignal),
      })
    )
  })

  it('passes an AbortSignal to fetch', async () => {
    const fetchMock = vi.fn(async () => makeJsonResponse(validList))
    vi.stubGlobal('fetch', fetchMock)

    const { useCredentials } = await import('../useCredentials')
    const { result } = renderHook(() => useCredentials(), {
      wrapper: CredentialsCacheProvider,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('aborts the request when the component unmounts before fetch resolves', async () => {
    let capturedSignal: AbortSignal | undefined
    const fetchMock = vi.fn(async (_url: unknown, init: unknown) => {
      capturedSignal = (init as RequestInit).signal as AbortSignal
      // Hang forever so we can observe the abort.
      await new Promise(() => {})
      return makeJsonResponse(validList)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { useCredentials } = await import('../useCredentials')
    const { unmount } = renderHook(() => useCredentials(), {
      wrapper: CredentialsCacheProvider,
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(capturedSignal!.aborted).toBe(false)

    unmount()

    expect(capturedSignal!.aborted).toBe(true)
  })

  it('returns empty array and stops loading on non-2xx response', async () => {
    const fetchMock = vi.fn(async () => makeJsonResponse({}, 500))
    vi.stubGlobal('fetch', fetchMock)

    const { useCredentials } = await import('../useCredentials')
    const { result } = renderHook(() => useCredentials(), {
      wrapper: CredentialsCacheProvider,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.credentials).toEqual([])
  })

  it('returns empty array and stops loading when getBearerToken rejects', async () => {
    mockGetBearerToken.mockRejectedValueOnce(new Error('auth failure'))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { useCredentials } = await import('../useCredentials')
    const { result } = renderHook(() => useCredentials(), {
      wrapper: CredentialsCacheProvider,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.credentials).toEqual([])
  })

  it('populates credentials on successful response', async () => {
    const fetchMock = vi.fn(async () => makeJsonResponse(validList))
    vi.stubGlobal('fetch', fetchMock)

    const { useCredentials } = await import('../useCredentials')
    const { result } = renderHook(() => useCredentials(), {
      wrapper: CredentialsCacheProvider,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.credentials).toHaveLength(1)
    expect(result.current.credentials[0].id).toBe('cred-1')
  })
})

describe('useCredentialDetail — request deduplication', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('sends exactly ONE request to /credentials/{id} on mount', async () => {
    const fetchMock = vi.fn(async () => makeJsonResponse(validCredentialDetail))
    vi.stubGlobal('fetch', fetchMock)

    const { useCredentialDetail } = await import('../useCredentialDetail')
    const { result } = renderHook(() => useCredentialDetail('cred-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/credentials/cred-1',
      expect.objectContaining({
        headers: { Authorization: `Bearer ${MOCK_TOKEN}` },
        signal: expect.any(AbortSignal),
      })
    )
  })

  it('URL-encodes the credential id in the request path', async () => {
    const fetchMock = vi.fn(async () => makeJsonResponse(validCredentialDetail))
    vi.stubGlobal('fetch', fetchMock)

    const { useCredentialDetail } = await import('../useCredentialDetail')
    const { result } = renderHook(() => useCredentialDetail('id with spaces'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    const [url] = fetchMock.mock.calls[0] as unknown as [string]
    expect(url).toContain(encodeURIComponent('id with spaces'))
  })

  it('aborts the request when the component unmounts before fetch resolves', async () => {
    let capturedSignal: AbortSignal | undefined
    const fetchMock = vi.fn(async (_url: unknown, init: unknown) => {
      capturedSignal = (init as RequestInit).signal as AbortSignal
      await new Promise(() => {})
      return makeJsonResponse(validCredentialDetail)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { useCredentialDetail } = await import('../useCredentialDetail')
    const { unmount } = renderHook(() => useCredentialDetail('cred-1'))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(capturedSignal!.aborted).toBe(false)

    unmount()

    expect(capturedSignal!.aborted).toBe(true)
  })

  it('re-fetches when the id prop changes', async () => {
    const fetchMock = vi.fn(async () => makeJsonResponse(validCredentialDetail))
    vi.stubGlobal('fetch', fetchMock)

    const { useCredentialDetail } = await import('../useCredentialDetail')
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useCredentialDetail(id),
      {
        initialProps: { id: 'cred-1' },
      }
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetchMock).toHaveBeenCalledTimes(1)

    act(() => rerender({ id: 'cred-2' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const [url2] = fetchMock.mock.calls[1] as unknown as [string]
    expect(url2).toContain('cred-2')
  })

  it('sets error state on non-2xx response', async () => {
    const fetchMock = vi.fn(async () => makeJsonResponse({}, 404))
    vi.stubGlobal('fetch', fetchMock)

    const { useCredentialDetail } = await import('../useCredentialDetail')
    const { result } = renderHook(() => useCredentialDetail('missing'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.credential).toBeNull()
    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('sets error state when getBearerToken rejects', async () => {
    mockGetBearerToken.mockRejectedValueOnce(new Error('auth failure'))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { useCredentialDetail } = await import('../useCredentialDetail')
    const { result } = renderHook(() => useCredentialDetail('cred-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('populates credential on successful response', async () => {
    const fetchMock = vi.fn(async () => makeJsonResponse(validCredentialDetail))
    vi.stubGlobal('fetch', fetchMock)

    const { useCredentialDetail } = await import('../useCredentialDetail')
    const { result } = renderHook(() => useCredentialDetail('cred-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.credential).not.toBeNull()
    expect(result.current.credential?.id).toBe('cred-1')
    expect(result.current.error).toBeNull()
  })
})
