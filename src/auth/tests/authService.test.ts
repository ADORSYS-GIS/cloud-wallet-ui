import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('../crypto', () => ({
  getOrCreateKeyPair: vi.fn(async () => ({
    privateKeyJwk: { kty: 'EC' },
    publicKeyJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
  })),
  createJwt: vi.fn(async () => 'mock.jwt.token'),
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

import { initAuth, getBearerToken, resetAuthState } from '../authService'
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
})
