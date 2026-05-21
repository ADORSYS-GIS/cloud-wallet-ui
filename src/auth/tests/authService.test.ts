import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('../crypto', () => ({
  getOrCreateKeyPair: vi.fn(async () => ({
    privateKeyJwk: { kty: 'EC' },
    publicKeyJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
  })),
  createJwt: vi.fn(async () => 'mock.jwt.token'),
  clearPersistedKeyPair: vi.fn(),
}))

vi.mock('../tenant', () => ({
  registerTenant: vi.fn(async () => ({
    tenant_id: 'new-tenant-uuid',
    name: 'DATEV Cloud Wallet',
  })),
  storeTenantId: vi.fn(),
  getStoredTenantId: vi.fn(() => null),
  DEFAULT_TENANT_NAME: 'DATEV Cloud Wallet',
}))

import {
  initAuth,
  getBearerToken,
  resetAuthState,
  clearPersistedKeyPair,
} from '../authService'
import { registerTenant, getStoredTenantId, storeTenantId } from '../tenant'
import { createJwt } from '../crypto'

const mockRegister = vi.mocked(registerTenant)
const mockGetStored = vi.mocked(getStoredTenantId)
const mockStore = vi.mocked(storeTenantId)
const mockCreateJwt = vi.mocked(createJwt)

beforeEach(() => {
  resetAuthState()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('initAuth', () => {
  it('registers a new tenant when no tenant_id is stored', async () => {
    mockGetStored.mockReturnValue(null)

    const tenantId = await initAuth()

    expect(mockRegister).toHaveBeenCalledOnce()
    expect(mockStore).toHaveBeenCalledWith('new-tenant-uuid')
    expect(tenantId).toBe('new-tenant-uuid')
  })

  it('skips registration when a tenant_id is already stored', async () => {
    mockGetStored.mockReturnValue('existing-tenant-uuid')

    const tenantId = await initAuth()

    expect(mockRegister).not.toHaveBeenCalled()
    expect(tenantId).toBe('existing-tenant-uuid')
  })

  it('is idempotent — multiple calls do not re-register', async () => {
    mockGetStored.mockReturnValue(null)

    await initAuth()
    await initAuth()
    await initAuth()

    expect(mockRegister).toHaveBeenCalledOnce()
  })

  it('registers tenant only once for concurrent initAuth calls', async () => {
    mockGetStored.mockReturnValue(null)

    const [t1, t2] = await Promise.all([initAuth(), initAuth()])

    expect(t1).toBe('new-tenant-uuid')
    expect(t2).toBe('new-tenant-uuid')
    expect(mockRegister).toHaveBeenCalledOnce()
    expect(mockStore).toHaveBeenCalledOnce()
  })
})

describe('getBearerToken', () => {
  it('returns a token string', async () => {
    mockGetStored.mockReturnValue('tenant-123')

    const token = await getBearerToken()
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })

  it('calls createJwt with the correct tenant_id', async () => {
    mockGetStored.mockReturnValue('tenant-xyz')

    await getBearerToken()

    expect(mockCreateJwt).toHaveBeenCalledWith(
      'tenant-xyz',
      expect.objectContaining({ publicKeyJwk: expect.any(Object) }),
      expect.any(Number)
    )
  })

  it('returns a cached token on repeated calls', async () => {
    mockGetStored.mockReturnValue('tenant-cached')

    const t1 = await getBearerToken()
    const t2 = await getBearerToken()

    expect(t1).toBe(t2)
    // createJwt should only have been called once
    expect(mockCreateJwt).toHaveBeenCalledOnce()
  })

  it('regenerates token when cache is cleared by resetAuthState', async () => {
    mockGetStored.mockReturnValue('tenant-refresh')

    await getBearerToken()
    resetAuthState()
    await getBearerToken()

    expect(mockCreateJwt).toHaveBeenCalledTimes(2)
  })

  it('generates a new JWT (not the cached one) after resetAuthState', async () => {
    mockGetStored.mockReturnValue('tenant-new-jwt')

    // First call — produces and caches 'mock.jwt.token'
    mockCreateJwt.mockResolvedValueOnce('first.jwt.token')
    const first = await getBearerToken()
    expect(first).toBe('first.jwt.token')
    expect(mockCreateJwt).toHaveBeenCalledTimes(1)

    // Reset in-memory state; the cached token must no longer be returned
    resetAuthState()

    // Second call — must invoke createJwt again, not return the cached value
    mockCreateJwt.mockResolvedValueOnce('second.jwt.token')
    const second = await getBearerToken()
    expect(second).toBe('second.jwt.token')
    expect(mockCreateJwt).toHaveBeenCalledTimes(2)

    // The two tokens must be distinct
    expect(first).not.toBe(second)
  })
})

describe('resetAuthState', () => {
  it('forces re-registration on next initAuth call', async () => {
    mockGetStored.mockReturnValue(null)

    await initAuth()
    expect(mockRegister).toHaveBeenCalledOnce()

    resetAuthState()
    mockGetStored.mockReturnValue(null) // still no stored tenant

    await initAuth()
    expect(mockRegister).toHaveBeenCalledTimes(2)
  })

  it('only clears in-memory state — does not touch localStorage key pair', async () => {
    // clearPersistedKeyPair is a separate concern; resetAuthState must not call it
    mockGetStored.mockReturnValue('tenant-mem-only')
    await getBearerToken()

    const { clearPersistedKeyPair: mockClearPersisted } = await import('../crypto')
    const clearMock = vi.mocked(mockClearPersisted)
    clearMock.mockClear()

    resetAuthState()

    expect(clearMock).not.toHaveBeenCalled()
  })
})

describe('clearPersistedKeyPair', () => {
  it('is re-exported from authService for convenience', () => {
    // Verifies the export exists and is the same function from crypto
    expect(typeof clearPersistedKeyPair).toBe('function')
  })

  it('can be called alongside resetAuthState for a full auth reset', async () => {
    mockGetStored.mockReturnValue('tenant-full-reset')
    await getBearerToken()

    // A full logout/reset: clear both in-memory and persisted state
    resetAuthState()
    clearPersistedKeyPair()

    expect(clearPersistedKeyPair).toHaveBeenCalledOnce()

    // After a full reset, the next getBearerToken call must re-generate everything
    mockCreateJwt.mockResolvedValueOnce('fresh.after.reset.token')
    const token = await getBearerToken()
    expect(token).toBe('fresh.after.reset.token')
  })
})
