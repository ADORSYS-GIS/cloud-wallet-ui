// @vitest-environment jsdom
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ApiError } from '../../api/client'
import { submitPresentationConsent } from '../../api/presentation/consent'
import {
  PresentationProvider,
  usePresentationState,
} from '../../state/presentation.state'
import { usePresentationSubmission } from './usePresentationSubmission'

vi.mock('../../api/presentation/consent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/presentation/consent')>()
  return {
    ...actual,
    submitPresentationConsent: vi.fn(),
  }
})

const mockedSubmitPresentationConsent = vi.mocked(submitPresentationConsent)

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <PresentationProvider>{children}</PresentationProvider>
    </MemoryRouter>
  )
}

describe('usePresentationSubmission', () => {
  const assignSpy = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('location', { ...window.location, assign: assignSpy })
    assignSpy.mockReset()
    mockedSubmitPresentationConsent.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('submits consent and navigates to success on completed cross-device flow', async () => {
    mockedSubmitPresentationConsent.mockResolvedValueOnce({
      status: 'completed',
      redirect_uri: null,
      verifier_response: { redirect_uri: 'https://verifier.example/success' },
    })

    const { result } = renderHook(
      () => ({
        submission: usePresentationSubmission(),
        presentation: usePresentationState(),
      }),
      { wrapper }
    )

    await act(async () => {
      await result.current.submission.submitConsent({
        sessionId: 'prs_test',
        accepted: true,
        selectedCredentials: [{ query_id: 'pid_request', credential_id: 'cred-1' }],
        transactionDataAcknowledged: true,
      })
    })

    expect(mockedSubmitPresentationConsent).toHaveBeenCalledWith('prs_test', {
      accepted: true,
      selected_credentials: [{ query_id: 'pid_request', credential_id: 'cred-1' }],
      transaction_data_acknowledged: true,
    })
    expect(result.current.presentation.status).toBe('success')
    expect(result.current.presentation.submissionResult?.success).toBe(true)
  })

  it('redirects browser on completed same-device flow', async () => {
    mockedSubmitPresentationConsent.mockResolvedValueOnce({
      status: 'completed',
      redirect_uri: 'https://verifier.example/callback#vp_token=abc',
      verifier_response: null,
    })

    const { result } = renderHook(() => usePresentationSubmission(), { wrapper })

    await act(async () => {
      await result.current.submitConsent({
        sessionId: 'prs_test',
        accepted: true,
        selectedCredentials: [{ query_id: 'pid_request', credential_id: 'cred-1' }],
      })
    })

    expect(assignSpy).toHaveBeenCalledWith(
      'https://verifier.example/callback#vp_token=abc'
    )
  })

  it('returns home immediately when user declines', async () => {
    let resolveDecline:
      | ((value: {
          status: 'rejected'
          redirect_uri: null
          verifier_response: null
        }) => void)
      | undefined

    mockedSubmitPresentationConsent.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDecline = resolve
        })
    )

    function LocationProbe() {
      const location = useLocation()
      return <span data-testid="pathname">{location.pathname}</span>
    }

    const { result } = renderHook(
      () => ({
        submission: usePresentationSubmission(),
        presentation: usePresentationState(),
      }),
      {
        wrapper: ({ children }) => (
          <MemoryRouter initialEntries={['/present/details']}>
            <PresentationProvider>
              {children}
              <LocationProbe />
            </PresentationProvider>
          </MemoryRouter>
        ),
      }
    )

    await act(async () => {
      void result.current.submission.submitConsent({
        sessionId: 'prs_test',
        accepted: false,
      })
    })

    expect(screen.getByTestId('pathname').textContent).toBe('/')
    expect(result.current.presentation.status).toBe('idle')
    expect(result.current.submission.isSharing).toBe(false)

    await act(async () => {
      resolveDecline?.({
        status: 'rejected',
        redirect_uri: null,
        verifier_response: null,
      })
      await Promise.resolve()
    })

    expect(mockedSubmitPresentationConsent).toHaveBeenCalledWith('prs_test', {
      accepted: false,
    })
  })

  it('routes to error screen when share is rejected by verifier', async () => {
    mockedSubmitPresentationConsent.mockResolvedValueOnce({
      status: 'rejected',
      redirect_uri: null,
      verifier_response: null,
    })

    const { result } = renderHook(
      () => ({
        submission: usePresentationSubmission(),
        presentation: usePresentationState(),
      }),
      { wrapper }
    )

    await act(async () => {
      await result.current.submission.submitConsent({
        sessionId: 'prs_test',
        accepted: true,
        selectedCredentials: [{ query_id: 'pid_request', credential_id: 'cred-1' }],
      })
    })

    expect(result.current.presentation.status).toBe('rejected')
    expect(result.current.presentation.submissionResult?.status).toBe('rejected')
  })

  it('routes to error page with retry path for recoverable consent failures', async () => {
    mockedSubmitPresentationConsent.mockRejectedValueOnce(
      new ApiError(500, 'VP Token construction failed.', {
        errorCode: 'presentation_build_failed',
        errorDescription: 'VP Token construction failed.',
      })
    )

    function LocationProbe() {
      const location = useLocation()
      return <span data-testid="pathname">{location.pathname}</span>
    }

    const { result } = renderHook(
      () => ({
        submission: usePresentationSubmission(),
        presentation: usePresentationState(),
      }),
      {
        wrapper: ({ children }) => (
          <MemoryRouter>
            <PresentationProvider>
              {children}
              <LocationProbe />
            </PresentationProvider>
          </MemoryRouter>
        ),
      }
    )

    await act(async () => {
      await result.current.submission.submitConsent({
        sessionId: 'prs_test',
        accepted: true,
        selectedCredentials: [{ query_id: 'pid_request', credential_id: 'cred-1' }],
      })
    })

    expect(result.current.presentation.status).toBe('error')
    expect(result.current.presentation.error?.code).toBe('presentation_build_failed')
  })

  it('maps API errors and sets presentation error state', async () => {
    mockedSubmitPresentationConsent.mockRejectedValueOnce(
      new ApiError(400, 'credential_id does not match a candidate for the query_id.', {
        errorCode: 'invalid_credential_selection',
        errorDescription: 'credential_id does not match a candidate for the query_id.',
      })
    )

    const { result } = renderHook(
      () => ({
        submission: usePresentationSubmission(),
        presentation: usePresentationState(),
      }),
      { wrapper }
    )

    await act(async () => {
      await result.current.submission.submitConsent({
        sessionId: 'prs_test',
        accepted: true,
        selectedCredentials: [{ query_id: 'pid_request', credential_id: 'cred-1' }],
      })
    })

    expect(result.current.presentation.status).toBe('error')
    expect(result.current.presentation.error?.code).toBe('invalid_credential_selection')
  })

  it('does not enter sharing state when user declines', async () => {
    mockedSubmitPresentationConsent.mockResolvedValueOnce({
      status: 'rejected',
      redirect_uri: null,
      verifier_response: null,
    })

    const { result } = renderHook(() => usePresentationSubmission(), { wrapper })

    await act(async () => {
      await result.current.submitConsent({
        sessionId: 'prs_test',
        accepted: false,
      })
    })

    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.isSharing).toBe(false)
  })

  it('exposes isSubmitting while request is in flight', async () => {
    let resolveSubmit:
      | ((value: {
          status: 'completed'
          redirect_uri: null
          verifier_response: null
        }) => void)
      | undefined

    mockedSubmitPresentationConsent.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve
        })
    )

    const { result } = renderHook(() => usePresentationSubmission(), { wrapper })

    let submitPromise: Promise<void> | undefined
    act(() => {
      submitPromise = result.current.submitConsent({
        sessionId: 'prs_test',
        accepted: true,
        selectedCredentials: [{ query_id: 'pid_request', credential_id: 'cred-1' }],
      })
    })

    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(true)
      expect(result.current.isSharing).toBe(true)
    })

    await act(async () => {
      resolveSubmit?.({
        status: 'completed',
        redirect_uri: null,
        verifier_response: null,
      })
      await submitPromise
    })

    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.isSharing).toBe(false)
  })
})
