import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { registerTenant, storeTenantId, getStoredTenantId } from '../tenant'

const store: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key]
  }),
  clear: vi.fn(() => {
    for (const k of Object.keys(store)) delete store[k]
  }),
}

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
  vi.stubGlobal('localStorage', localStorageMock)
  localStorageMock.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('storeTenantId / getStoredTenantId', () => {
  it('persists and retrieves a tenant_id', () => {
    storeTenantId('tenant-abc-123')
    expect(getStoredTenantId()).toBe('tenant-abc-123')
  })

  it('returns null when nothing has been stored', () => {
    expect(getStoredTenantId()).toBeNull()
  })
})

describe('registerTenant', () => {
  it('POSTs to /tenants with the given name and returns the response', async () => {
    const mockResponse = {
      tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      name: 'DATEV Cloud Wallet',
    }
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => mockResponse,
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const result = await registerTenant('DATEV Cloud Wallet')

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('http://api.test/api/v1/tenants')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body as string)).toEqual({ name: 'DATEV Cloud Wallet' })
    expect(result.tenant_id).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479')
  })

  it('does NOT include an Authorization header (unauthenticated endpoint)', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({ tenant_id: 'some-id', name: 'Test' }),
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await registerTenant('Test')

    const [, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const headers = options.headers as Record<string, string> | undefined
    expect(headers?.['Authorization']).toBeUndefined()
  })

  it('throws on non-2xx response', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({}),
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await expect(registerTenant('Test')).rejects.toThrow('400')
  })

  it('includes response body text in thrown error when available', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 409,
      text: async () => 'tenant name already exists',
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await expect(registerTenant('Test')).rejects.toThrow(
      'Tenant registration failed with HTTP 409: tenant name already exists'
    )
  })

  it('throws when tenant_id is missing from the response', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({ name: 'Test' }), // no tenant_id
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await expect(registerTenant('Test')).rejects.toThrow('tenant_id')
  })
})
