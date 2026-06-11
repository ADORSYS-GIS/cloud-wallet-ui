// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PresentationError, startPresentation } from '../../api/presentation/start'
import { PresentationProvider } from '../../state/presentation.state'
import type { StartPresentationResponse } from '../../types/presentation'
import { usePresentationSession } from './usePresentationSession'

vi.mock('../../api/presentation/start', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/presentation/start')>()
  return {
    ...actual,
    startPresentation: vi.fn(),
  }
})

const mockedStartPresentation = vi.mocked(startPresentation)

function wrapper({ children }: { children: ReactNode }) {
  return <PresentationProvider>{children}</PresentationProvider>
}

const requestBody = {
  request:
    'openid4vp://?client_id=https%3A%2F%2Fverifier.example&request_uri=https%3A%2F%2Fverifier.example%2Frequest&response_type=vp_token&nonce=nonce-123&scope=openid',
  origin: 'http://localhost:5173',
}

const mockStartPresentationResponse: StartPresentationResponse = {
  session_id: 'prs_7f3kQ2mXpLnVwRtYbHsD9cAeUjZo1Ni',
  expires_at: '2026-04-08T14:35:00Z',
  flow: 'cross_device',
  verifier: {
    name: 'Example Verifier',
    verified: true,
  },
  credential_matches: [
    {
      query_id: 'pid_request',
      required: true,
      candidates: [
        {
          credential_id: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
          display: {
            name: 'Identity Credential',
            issuer_name: 'Example Issuer',
            credential_type: 'eu.europa.ec.eudi.pid.1',
          },
          requested_claims: [],
        },
      ],
    },
  ],
  requires_consent: true,
}

describe('usePresentationSession', () => {
  it('stores presentation session data on success', async () => {
    mockedStartPresentation.mockResolvedValueOnce(mockStartPresentationResponse)

    const { result } = renderHook(() => usePresentationSession(), { wrapper })

    let startResult: Awaited<ReturnType<typeof result.current.startRequest>> | undefined
    await act(async () => {
      startResult = await result.current.startRequest(requestBody)
    })

    expect(startResult).toEqual({ ok: true })
    await waitFor(() => {
      expect(result.current.sessionState.status).toBe('success')
    })
  })

  it('surfaces contract validation errors', async () => {
    const { ContractError } = await import('../../api/validation')
    mockedStartPresentation.mockRejectedValueOnce(
      new ContractError('StartPresentationResponse', 'verifier', null)
    )

    const { result } = renderHook(() => usePresentationSession(), { wrapper })

    let startResult: Awaited<ReturnType<typeof result.current.startRequest>> | undefined
    await act(async () => {
      startResult = await result.current.startRequest(requestBody)
    })

    expect(startResult?.ok).toBe(false)
    expect(result.current.sessionState.status).toBe('error')
    if (result.current.sessionState.status === 'error') {
      expect(result.current.sessionState.error.code).toBe('internal_error')
    }
  })

  it('surfaces API errors', async () => {
    mockedStartPresentation.mockRejectedValueOnce(
      new PresentationError({
        httpStatus: 400,
        code: 'invalid_request',
        message: 'Invalid request',
      })
    )

    const { result } = renderHook(() => usePresentationSession(), { wrapper })

    let startResult: Awaited<ReturnType<typeof result.current.startRequest>> | undefined
    await act(async () => {
      startResult = await result.current.startRequest(requestBody)
    })

    expect(startResult?.ok).toBe(false)
    if (startResult && !startResult.ok) {
      expect(startResult.error.code).toBe('invalid_request')
    }
    expect(result.current.sessionState.status).toBe('error')
  })
})
