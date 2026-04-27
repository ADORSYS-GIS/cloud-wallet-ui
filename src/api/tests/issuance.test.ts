import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { startIssuanceSession, IssuanceError } from '../issuance'
import { ApiError } from '../client'
import { ContractError } from '../validation'
import type { StartIssuanceResponse } from '../../types/issuance'

// Mock the tenant module because startIssuanceSession depends on authService,
// which in turn depends on tenant registration.
vi.mock('../../auth/tenant', () => ({
  registerTenant: vi.fn(async () => ({
    tenant_id: 'mock-tenant-id',
    name: 'Mock Tenant',
  })),
  getStoredTenantId: vi.fn(() => 'mock-tenant-id'),
  storeTenantId: vi.fn(),
}))

const MOCK_BEARER_TOKEN = 'mock.jwt.token'

vi.mock('../../auth/crypto', () => ({
  getOrCreateKeyPair: vi.fn(async () => ({
    privateKeyJwk: { kty: 'EC' },
    publicKeyJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
  })),
  createJwt: vi.fn(async () => MOCK_BEARER_TOKEN),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockFetchResponse = {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

function mockResponse(
  partial: Partial<MockFetchResponse> & Pick<MockFetchResponse, 'ok' | 'status'>
): MockFetchResponse {
  return {
    ok: partial.ok,
    status: partial.status,
    json: partial.json ?? (async () => ({})),
  }
}

const minimalSession: StartIssuanceResponse = {
  session_id: 'ses_abc123',
  expires_at: '2026-04-08T14:35:00Z',
  issuer: {
    credential_issuer: 'https://issuer.example.eu',
    display_name: 'Example Issuer',
    logo_uri: null,
  },
  credential_types: [
    {
      credential_configuration_id: 'eu.europa.ec.eudi.pid.1',
      format: 'vc+sd-jwt',
      display: {
        name: 'EU Personal ID',
        description: 'Official EU personal identity document',
        background_color: '#12107c',
        text_color: '#ffffff',
        logo: null,
      },
    },
  ],
  flow: 'authorization_code',
  tx_code_required: false,
  tx_code: null,
}

describe('startIssuanceSession', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('calls POST /issuance/start with { offer } body and returns validated session on success', async () => {
    const fetchMock = vi.fn(async () =>
      mockResponse({
        ok: true,
        status: 201,
        json: async () => minimalSession,
      })
    )
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const rawOffer =
      'openid-credential-offer://?credential_offer_uri=https%3A%2F%2Fissuer.example.eu%2Foffer%2Fabc'

    const result = await startIssuanceSession(rawOffer)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/issuance/start',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MOCK_BEARER_TOKEN}`,
        },
        body: JSON.stringify({ offer: rawOffer }),
      })
    )
    expect(result).toEqual(minimalSession)
  })

  it('throws ApiError when the server returns 400', async () => {
    const fetchMock = vi.fn(async () => mockResponse({ ok: false, status: 400 }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await expect(
      startIssuanceSession('openid-credential-offer://?credential_offer_uri=bad')
    ).rejects.toThrow(ApiError)

    // Must NOT retry — no fallback GET
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('parses OpenAPI ErrorResponse fields into ApiError details', async () => {
    const fetchMock = vi.fn(async () =>
      mockResponse({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'invalid_credential_offer',
          error_description: 'The credential offer URI could not be parsed.',
        }),
      })
    )
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const err = await startIssuanceSession('openid-credential-offer://?x=y').catch(
      (e) => e
    )
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).errorCode).toBe('invalid_credential_offer')
    expect((err as ApiError).errorDescription).toBe(
      'The credential offer URI could not be parsed.'
    )
    expect((err as ApiError).message).toBe(
      'The credential offer URI could not be parsed.'
    )
  })

  it('throws ApiError when the server returns 401', async () => {
    const fetchMock = vi.fn(async () => mockResponse({ ok: false, status: 401 }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const err = await startIssuanceSession('openid-credential-offer://?x=y').catch(
      (e) => e
    )
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws ApiError when the server returns 502', async () => {
    const fetchMock = vi.fn(async () => mockResponse({ ok: false, status: 502 }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const err = await startIssuanceSession('openid-credential-offer://?x=y').catch(
      (e) => e
    )
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(502)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns session with tx_code when pre-authorized flow requires one', async () => {
    const sessionWithTxCode: StartIssuanceResponse = {
      ...minimalSession,
      session_id: 'ses_pre_auth',
      flow: 'pre_authorized_code',
      tx_code_required: true,
      tx_code: {
        input_mode: 'numeric',
        length: 6,
        description: 'Check your email for the one-time code.',
      },
    }

    const fetchMock = vi.fn(async () =>
      mockResponse({
        ok: true,
        status: 201,
        json: async () => sessionWithTxCode,
      })
    )
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const result = await startIssuanceSession('openid-credential-offer://?x=y')
    // Must return the actual session returned by the server, not the minimal fixture
    expect(result).toEqual(sessionWithTxCode)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not perform a GET fallback on any error status', async () => {
    // Guard against the old 405-fallback behaviour being reintroduced.
    const fetchMock = vi.fn(async () => mockResponse({ ok: false, status: 405 }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const err = await startIssuanceSession('openid-credential-offer://?x=y').catch(
      (e) => e
    )
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(405)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws ContractError when backend returns a response missing required fields', async () => {
    // Server responded 201 OK but body is contract-violating (missing session_id)
    const fetchMock = vi.fn(async () =>
      mockResponse({
        ok: true,
        status: 201,
        json: async () => ({ ...minimalSession, session_id: undefined }),
      })
    )
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await expect(startIssuanceSession('openid-credential-offer://?x=y')).rejects.toThrow(
      ContractError
    )
  })

  it('throws ContractError when backend returns an unknown flow', async () => {
    const fetchMock = vi.fn(async () =>
      mockResponse({
        ok: true,
        status: 201,
        json: async () => ({ ...minimalSession, flow: 'device_code' }),
      })
    )
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await expect(startIssuanceSession('openid-credential-offer://?x=y')).rejects.toThrow(
      ContractError
    )
  })

  it('IssuanceError exposes structured fields from IssuanceApiError', () => {
    const err = new IssuanceError({
      httpStatus: 400,
      error: 'invalid_credential_offer',
      error_description: 'The credential offer URI could not be parsed.',
    })

    expect(err).toBeInstanceOf(IssuanceError)
    expect(err.httpStatus).toBe(400)
    expect(err.error).toBe('invalid_credential_offer')
    expect(err.error_description).toBe('The credential offer URI could not be parsed.')
    expect(err.message).toBe('The credential offer URI could not be parsed.')
    expect(err.name).toBe('IssuanceError')
  })

  it('IssuanceError falls back to error code as message when description is null', () => {
    const err = new IssuanceError({
      httpStatus: 502,
      error: 'issuer_metadata_fetch_failed',
      error_description: null,
    })

    expect(err.message).toBe('issuer_metadata_fetch_failed')
  })
})
