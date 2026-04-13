import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { startIssuanceSession, IssuanceError } from '../issuance'
import type { StartIssuanceResponse } from '../../types/issuance'

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('startIssuanceSession', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('returns session on success', async () => {
    const fetchMock = vi.fn(async () =>
      mockResponse({ ok: true, status: 201, json: async () => minimalSession })
    )
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const result = await startIssuanceSession('openid-credential-offer://?x=y')
    expect(result).toEqual(minimalSession)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws IssuanceError with parsed body on 400', async () => {
    const errorBody = {
      error: 'invalid_credential_offer',
      error_description: 'The credential offer URI could not be parsed.',
    }
    const fetchMock = vi.fn(async () =>
      mockResponse({ ok: false, status: 400, json: async () => errorBody })
    )
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await expect(
      startIssuanceSession('openid-credential-offer://?bad')
    ).rejects.toSatisfy((err: unknown) => {
      if (!(err instanceof IssuanceError)) return false
      return (
        err.httpStatus === 400 &&
        err.error === 'invalid_credential_offer' &&
        err.error_description === 'The credential offer URI could not be parsed.'
      )
    })
  })

  it('throws IssuanceError with parsed body on 502', async () => {
    const errorBody = {
      error: 'issuer_metadata_fetch_failed',
      error_description: 'Could not reach the issuer metadata endpoint.',
    }
    const fetchMock = vi.fn(async () =>
      mockResponse({ ok: false, status: 502, json: async () => errorBody })
    )
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await expect(
      startIssuanceSession('openid-credential-offer://?x=y')
    ).rejects.toSatisfy((err: unknown) => {
      if (!(err instanceof IssuanceError)) return false
      return err.httpStatus === 502 && err.error === 'issuer_metadata_fetch_failed'
    })
  })

  it('throws IssuanceError with fallback error code when body is not JSON', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => {
        throw new SyntaxError('Not JSON')
      },
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await expect(
      startIssuanceSession('openid-credential-offer://?x=y')
    ).rejects.toSatisfy((err: unknown) => {
      if (!(err instanceof IssuanceError)) return false
      return err.httpStatus === 401 && err.error === 'unauthorized'
    })
  })

  it('does NOT retry on any error status', async () => {
    const fetchMock = vi.fn(async () =>
      mockResponse({ ok: false, status: 405, json: async () => ({ error: 'unknown' }) })
    )
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await expect(startIssuanceSession('openid-credential-offer://?x=y')).rejects.toThrow(
      IssuanceError
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('IssuanceError carries structured data and is instanceof Error', () => {
    const err = new IssuanceError({
      httpStatus: 400,
      error: 'invalid_credential_offer',
      error_description: 'Bad offer',
    })
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(IssuanceError)
    expect(err.httpStatus).toBe(400)
    expect(err.error).toBe('invalid_credential_offer')
    expect(err.error_description).toBe('Bad offer')
    expect(err.message).toBe('Bad offer')
    expect(err.name).toBe('IssuanceError')
  })

  it('IssuanceError uses error code as message when error_description is null', () => {
    const err = new IssuanceError({
      httpStatus: 502,
      error: 'issuer_metadata_fetch_failed',
      error_description: null,
    })
    expect(err.message).toBe('issuer_metadata_fetch_failed')
  })
})