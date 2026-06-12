// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
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

  it('routes to rejection page when user declines', async () => {
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
        accepted: false,
      })
    })

    expect(mockedSubmitPresentationConsent).toHaveBeenCalledWith('prs_test', {
      accepted: false,
    })
    expect(result.current.presentation.status).toBe('rejected')
    expect(result.current.presentation.error).toBeUndefined()
    expect(result.current.presentation.submissionResult?.status).toBe('rejected')
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
  })
})
