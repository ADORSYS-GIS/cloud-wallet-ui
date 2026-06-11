// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PresentationError, startPresentation } from '../../api/presentation/start'
import { PresentationProvider } from '../../state/presentation.state'
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

const authorization = {
  client_id: 'https://verifier.example',
  request_uri: 'https://verifier.example/request',
  response_type: 'vp_token',
  nonce: 'nonce-123',
  scope: 'openid',
}

const startResponse = {
  session_id: 'prs_test_session',
  expires_at: '2026-04-08T14:35:00Z',
  flow: 'cross_device' as const,
  verifier: {
    name: 'Keycloak-demo',
    verified: true,
    verification_method: 'x509' as const,
  },
  purpose: 'Age verification.',
  credential_matches: [
    {
      query_id: 'identity',
      required: true,
      candidates: [
        {
          credential_id: 'cred-1',
          display: { name: 'Identity Credential' },
          requested_claims: [{ path: ['username'], display_name: 'Username' }],
        },
      ],
    },
  ],
  requires_consent: true,
}

describe('usePresentationSession', () => {
  it('stores OpenAPI session data on success', async () => {
    mockedStartPresentation.mockResolvedValueOnce(startResponse)

    const { result } = renderHook(() => usePresentationSession(), { wrapper })

    await act(async () => {
      await result.current.startRequest(authorization)
    })

    await waitFor(() => {
      expect(result.current.sessionState.status).toBe('success')
    })
  })

  it('surfaces contract validation errors', async () => {
    const { ContractError } = await import('../../api/validation')
    mockedStartPresentation.mockRejectedValueOnce(
      new ContractError('StartPresentationResponse', 'session_id', null)
    )

    const { result } = renderHook(() => usePresentationSession(), { wrapper })

    await act(async () => {
      await result.current.startRequest(authorization)
    })

    expect(result.current.sessionState.status).toBe('error')
    if (result.current.sessionState.status === 'error') {
      expect(result.current.sessionState.error.code).toBe('internal_error')
    }
  })

  it('surfaces API errors', async () => {
    mockedStartPresentation.mockRejectedValueOnce(
      new PresentationError({
        httpStatus: 400,
        code: 'invalid_presentation_request',
        message: 'Invalid request',
      })
    )

    const { result } = renderHook(() => usePresentationSession(), { wrapper })

    await act(async () => {
      await result.current.startRequest(authorization)
    })

    expect(result.current.sessionState.status).toBe('error')
    if (result.current.sessionState.status === 'error') {
      expect(result.current.sessionState.error.code).toBe('invalid_presentation_request')
    }
  })
})
