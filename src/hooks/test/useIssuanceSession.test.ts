import * as React from 'react'
import { renderHook, act } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { useIssuanceSession } from '../../hooks/useIssuanceSession'
import { IssuanceError } from '../../api/issuance'
import type { StartIssuanceResponse } from '../../types/issuance'
import { CredentialOfferProvider } from '../../state/issuance.state'

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

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
// Mock startIssuanceSession
// ---------------------------------------------------------------------------

vi.mock('../../api/issuance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/issuance')>()
  return {
    ...actual,
    startIssuanceSession: vi.fn(),
  }
})

import { startIssuanceSession } from '../../api/issuance'
const mockStart = vi.mocked(startIssuanceSession)

// Wrap every renderHook call in the required context provider.
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(CredentialOfferProvider, null, children)

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useIssuanceSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts idle', () => {
    const { result } = renderHook(() => useIssuanceSession(), { wrapper })
    expect(result.current.offerState.status).toBe('idle')
  })

  it('transitions to success with session on valid offer', async () => {
    mockStart.mockResolvedValueOnce(minimalSession)

    const { result } = renderHook(() => useIssuanceSession(), { wrapper })

    await act(async () => {
      await result.current.submitOffer('openid-credential-offer://?x=y')
    })

    expect(result.current.offerState.status).toBe('success')
    if (result.current.offerState.status === 'success') {
      expect(result.current.offerState.session).toEqual(minimalSession)
    }
  })

  it('sets error state with structured apiError on IssuanceError', async () => {
    mockStart.mockRejectedValueOnce(
      new IssuanceError({
        httpStatus: 400,
        error: 'invalid_credential_offer',
        error_description: 'The credential offer URI could not be parsed.',
      })
    )

    const { result } = renderHook(() => useIssuanceSession(), { wrapper })

    await act(async () => {
      await result.current.submitOffer('openid-credential-offer://?x=y')
    })

    expect(result.current.offerState.status).toBe('error')
    if (result.current.offerState.status === 'error') {
      expect(result.current.offerState.apiError.httpStatus).toBe(400)
      expect(result.current.offerState.apiError.error).toBe('invalid_credential_offer')
      expect(result.current.offerState.rawMessage).toBe(
        'The credential offer URI could not be parsed.'
      )
    }
  })

  it('falls back to user-friendly message when error_description is null', async () => {
    mockStart.mockRejectedValueOnce(
      new IssuanceError({
        httpStatus: 502,
        error: 'issuer_metadata_fetch_failed',
        error_description: null,
      })
    )

    const { result } = renderHook(() => useIssuanceSession(), { wrapper })

    await act(async () => {
      await result.current.submitOffer('openid-credential-offer://?x=y')
    })

    expect(result.current.offerState.status).toBe('error')
    if (result.current.offerState.status === 'error') {
      expect(result.current.offerState.rawMessage).toMatch(/issuer|connection/i)
    }
  })

  it('handles network error (non-IssuanceError) gracefully', async () => {
    mockStart.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const { result } = renderHook(() => useIssuanceSession(), { wrapper })

    await act(async () => {
      await result.current.submitOffer('openid-credential-offer://?x=y')
    })

    expect(result.current.offerState.status).toBe('error')
    if (result.current.offerState.status === 'error') {
      expect(result.current.offerState.apiError.httpStatus).toBe(0)
      expect(result.current.offerState.rawMessage).toBe('Failed to fetch')
    }
  })

  it('resets to idle after reset() is called', async () => {
    mockStart.mockResolvedValueOnce(minimalSession)

    const { result } = renderHook(() => useIssuanceSession(), { wrapper })

    await act(async () => {
      await result.current.submitOffer('openid-credential-offer://?x=y')
    })
    expect(result.current.offerState.status).toBe('success')

    act(() => {
      result.current.reset()
    })
    expect(result.current.offerState.status).toBe('idle')
  })

  it('handles 401 unauthorized with appropriate message', async () => {
    mockStart.mockRejectedValueOnce(
      new IssuanceError({
        httpStatus: 401,
        error: 'unauthorized',
        error_description: null,
      })
    )

    const { result } = renderHook(() => useIssuanceSession(), { wrapper })

    await act(async () => {
      await result.current.submitOffer('openid-credential-offer://?x=y')
    })

    expect(result.current.offerState.status).toBe('error')
    if (result.current.offerState.status === 'error') {
      expect(result.current.offerState.rawMessage).toMatch(/authentication/i)
    }
  })
})
