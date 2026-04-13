// @vitest-environment jsdom
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest'

// ---------------------------------------------------------------------------
// We re-import the module under test fresh for every test so the module-level
// state (_tenantId etc.) is reset.  Vitest's module isolation handles this via
// vi.resetModules() + dynamic import inside each test.
// ---------------------------------------------------------------------------

type TenantModule = typeof import('../tenant')

async function freshTenantModule(): Promise<TenantModule> {
  vi.resetModules()
  return import('../tenant')
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchSuccess(tenantId: string) {
  return vi.fn(async () => ({
    ok: true,
    status: 201,
    json: async () => ({ tenant_id: tenantId, name: 'DATEV Cloud Wallet' }),
  }))
}

function mockFetchFailure(status: number) {
  return vi.fn(async () => ({ ok: false, status }))
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let localStorageGetItem: MockInstance
let localStorageSetItem: MockInstance
let localStorageRemoveItem: MockInstance

beforeEach(() => {
  localStorage.clear()
  vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')

  localStorageGetItem = vi.spyOn(Storage.prototype, 'getItem')
  localStorageSetItem = vi.spyOn(Storage.prototype, 'setItem')
  localStorageRemoveItem = vi.spyOn(Storage.prototype, 'removeItem')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  localStorage.clear()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('initializeTenant — fresh device (nothing in storage)', () => {
  it('calls POST /api/v1/tenants and persists tenant_id + keys', async () => {
    vi.stubGlobal('fetch', mockFetchSuccess('uuid-fresh-1'))
    const { initializeTenant } = await freshTenantModule()

    await initializeTenant()

    expect(localStorageSetItem).toHaveBeenCalledWith('cw:tenant_id', 'uuid-fresh-1')
    expect(localStorageSetItem).toHaveBeenCalledWith(
      'cw:public_key_jwk',
      expect.any(String)
    )
    expect(localStorageSetItem).toHaveBeenCalledWith(
      'cw:private_key_jwk',
      expect.any(String)
    )
  })

  it('throws when POST /api/v1/tenants returns an error status', async () => {
    vi.stubGlobal('fetch', mockFetchFailure(500))
    const { initializeTenant } = await freshTenantModule()

    await expect(initializeTenant()).rejects.toThrow('Tenant registration failed')
  })
})

describe('initializeTenant — returning device (data in storage)', () => {
  it('skips POST /api/v1/tenants and reuses the stored tenant_id', async () => {
    // First init to populate localStorage
    vi.stubGlobal('fetch', mockFetchSuccess('uuid-stored-1'))
    const moduleA = await freshTenantModule()
    await moduleA.initializeTenant()

    // Second init in a fresh module — fetch should NOT be called again
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const moduleB = await freshTenantModule()
    await moduleB.initializeTenant()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(moduleB.getTenantId()).toBe('uuid-stored-1')
  })
})

describe('initializeTenant — idempotent in same session', () => {
  it('is a no-op on the second call within the same module instance', async () => {
    const fetchMock = mockFetchSuccess('uuid-idempotent')
    vi.stubGlobal('fetch', fetchMock)

    const { initializeTenant } = await freshTenantModule()
    await initializeTenant()
    await initializeTenant() // second call

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('getAuthorizationHeader', () => {
  it('returns a Bearer JWT string after successful initialization', async () => {
    vi.stubGlobal('fetch', mockFetchSuccess('uuid-auth-1'))
    const { initializeTenant, getAuthorizationHeader } = await freshTenantModule()

    await initializeTenant()
    const header = await getAuthorizationHeader()

    expect(header).toMatch(/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/)
  })

  it('throws when called before initializeTenant()', async () => {
    const { getAuthorizationHeader } = await freshTenantModule()

    await expect(getAuthorizationHeader()).rejects.toThrow('Auth not initialized')
  })
})

describe('getTenantId', () => {
  it('returns null before initialization', async () => {
    const { getTenantId } = await freshTenantModule()
    expect(getTenantId()).toBeNull()
  })

  it('returns the tenant_id after initialization', async () => {
    vi.stubGlobal('fetch', mockFetchSuccess('uuid-get-1'))
    const { initializeTenant, getTenantId } = await freshTenantModule()

    await initializeTenant()
    expect(getTenantId()).toBe('uuid-get-1')
  })
})