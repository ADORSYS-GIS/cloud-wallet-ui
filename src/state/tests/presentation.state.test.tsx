// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { StartPresentationResponse } from '../../types/presentation'
import { PresentationProvider, usePresentationState } from '../presentation.state'

const mockStartPresentationResponse: StartPresentationResponse = {
  session_id: 'prs_7f3kQ2mXpLnVwRtYbHsD9cAeUjZo1Ni',
  expires_at: '2026-04-08T14:35:00Z',
  flow: 'cross_device',
  verifier: {
    name: 'Keycloak demo Solutions Adorsys',
    logo_uri: 'https://verifier.example/logo.png',
    verified: true,
    verification_method: 'x509_san_dns',
  },
  purpose: 'Age verification for access to restricted content.',
  credential_matches: [
    {
      query_id: 'pid_request',
      required: true,
      candidates: [
        {
          credential_id: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
          display: {
            name: 'DATEV Unternehmensdaten',
            issuer_name: 'Keycloak demo Solutions Adorsys',
            credential_type: 'eu.europa.ec.eudi.pid.1',
            logo: null,
          },
          requested_claims: [],
        },
      ],
    },
  ],
  requires_consent: true,
}

const STORAGE_KEY = 'cloud_wallet_presentation_flow'

function PresentationProbe() {
  const state = usePresentationState()
  return (
    <div>
      <span data-testid="status">{state.status}</span>
      <span data-testid="verifier-name">{state.verifier?.name ?? ''}</span>
      <span data-testid="flow-active">{String(state.isFlowActive)}</span>
      <button
        type="button"
        onClick={() => {
          state.setStatus('selecting')
          state.setStartResponse(mockStartPresentationResponse)
        }}
      >
        start
      </button>
      <button
        type="button"
        onClick={() =>
          state.setSubmissionResult({
            success: true,
            redirect_uri: 'https://verifier.example/cb',
          })
        }
      >
        complete
      </button>
      <button
        type="button"
        onClick={() => state.setError({ code: 'user_rejected', message: 'Rejected' })}
      >
        fail
      </button>
      <button type="button" onClick={() => state.setSubmissionResult({ success: false })}>
        submit-fail
      </button>
      <button type="button" onClick={() => state.clear()}>
        clear
      </button>
    </div>
  )
}

function SetterProbe() {
  const state = usePresentationState()
  return (
    <div>
      <span data-testid="status">{state.status}</span>
      <span data-testid="session-id">{state.session_id ?? ''}</span>
      <span data-testid="match-count">
        {String(state.credential_matches?.length ?? 0)}
      </span>
      <span data-testid="selected-count">
        {String(state.selected_credentials?.length ?? 0)}
      </span>
      <span data-testid="disclosure-keys">
        {Object.keys(state.disclosedClaims ?? {}).join(',')}
      </span>
      <button
        type="button"
        onClick={() =>
          state.setStartResponse({
            ...mockStartPresentationResponse,
            session_id: 'prs_test_session_001',
          })
        }
      >
        set-session
      </button>
      <button
        type="button"
        onClick={() =>
          state.setStartResponse({
            ...mockStartPresentationResponse,
            session_id: 'prs_test_session_002',
            credential_matches: mockStartPresentationResponse.credential_matches,
          })
        }
      >
        set-matches
      </button>
      <button
        type="button"
        onClick={() => state.setDisclosedClaims({ 'cred-1': ['given_name'] })}
      >
        set-disclosures
      </button>
      <button
        type="button"
        onClick={() => {
          state.setStatus('loading')
          state.setStatus('parsing')
          state.setStatus('selecting')
        }}
      >
        advance-status
      </button>
      <button
        type="button"
        onClick={() => {
          state.setStartResponse(mockStartPresentationResponse)
          state.setSelectedCredentials([
            {
              query_id: 'pid_request',
              credential_id: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
            },
          ])
          state.setDisclosedClaims({ 'cred-1': ['given_name'] })
          state.setStartResponse({
            ...mockStartPresentationResponse,
            session_id: 'prs_new_session',
          })
        }}
      >
        new-session
      </button>
      <button
        type="button"
        onClick={() => {
          state.setSelectedCredentials([
            {
              query_id: 'pid_request',
              credential_id: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
            },
          ])
          state.setDisclosedClaims({ 'cred-1': ['given_name'] })
          state.setStartResponse({
            ...mockStartPresentationResponse,
            session_id: 'prs_refreshed_session',
            credential_matches: [
              {
                query_id: 'lpid_request',
                required: true,
                candidates: [
                  {
                    credential_id: 'a1b2c3d4-5678-90ab-cdef-123456789abc',
                    display: {
                      name: 'LPID',
                      issuer_name: 'Registry',
                      credential_type: 'eu.europa.ec.eudi.lpid.1',
                    },
                    requested_claims: [],
                  },
                ],
              },
            ],
          })
        }}
      >
        refresh-matches
      </button>
    </div>
  )
}

function SubmissionFailureProbe() {
  const state = usePresentationState()
  return (
    <div>
      <span data-testid="status">{state.status}</span>
      <span data-testid="error-code">{state.error?.code ?? ''}</span>
      <button type="button" onClick={() => state.setSubmissionResult({ success: false })}>
        submit-fail
      </button>
    </div>
  )
}

function OutsideConsumer() {
  usePresentationState()
  return <div>outside</div>
}

describe('usePresentationState', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('throws when used outside provider', () => {
    expect(() => render(<OutsideConsumer />)).toThrow(
      'usePresentationState must be used within PresentationProvider'
    )
  })

  it('provides default idle state inside provider', () => {
    render(
      <PresentationProvider>
        <PresentationProbe />
      </PresentationProvider>
    )
    expect(screen.getByTestId('status').textContent).toBe('idle')
    expect(screen.getByTestId('flow-active').textContent).toBe('false')
  })

  it('persists active flow to localStorage and recovers on remount', async () => {
    const { unmount } = render(
      <PresentationProvider>
        <PresentationProbe />
      </PresentationProvider>
    )

    await act(async () => {
      screen.getByRole('button', { name: 'start' }).click()
    })

    expect(screen.getByTestId('status').textContent).toBe('selecting')
    expect(screen.getByTestId('verifier-name').textContent).toBe(
      'Keycloak demo Solutions Adorsys'
    )
    expect(localStorage.getItem(STORAGE_KEY)).toContain('selecting')

    unmount()

    render(
      <PresentationProvider>
        <PresentationProbe />
      </PresentationProvider>
    )

    expect(screen.getByTestId('status').textContent).toBe('selecting')
    expect(screen.getByTestId('verifier-name').textContent).toBe(
      'Keycloak demo Solutions Adorsys'
    )
    expect(screen.getByTestId('flow-active').textContent).toBe('true')
  })

  it('clear removes persisted state', async () => {
    render(
      <PresentationProvider>
        <PresentationProbe />
      </PresentationProvider>
    )

    await act(async () => {
      screen.getByRole('button', { name: 'start' }).click()
    })
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()

    await act(async () => {
      screen.getByRole('button', { name: 'clear' }).click()
    })

    expect(screen.getByTestId('status').textContent).toBe('idle')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('keeps success state in memory until explicit clear and does not persist it', async () => {
    render(
      <PresentationProvider>
        <PresentationProbe />
      </PresentationProvider>
    )

    await act(async () => {
      screen.getByRole('button', { name: 'start' }).click()
    })
    expect(localStorage.getItem(STORAGE_KEY)).toContain('selecting')

    await act(async () => {
      screen.getByRole('button', { name: 'complete' }).click()
    })

    expect(screen.getByTestId('status').textContent).toBe('success')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()

    await act(async () => {
      screen.getByRole('button', { name: 'clear' }).click()
    })

    expect(screen.getByTestId('status').textContent).toBe('idle')
  })

  it('keeps error state in memory until explicit clear and does not persist it', async () => {
    render(
      <PresentationProvider>
        <PresentationProbe />
      </PresentationProvider>
    )

    await act(async () => {
      screen.getByRole('button', { name: 'start' }).click()
    })

    await act(async () => {
      screen.getByRole('button', { name: 'fail' }).click()
    })

    expect(screen.getByTestId('status').textContent).toBe('error')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()

    await act(async () => {
      screen.getByRole('button', { name: 'clear' }).click()
    })

    expect(screen.getByTestId('status').textContent).toBe('idle')
  })

  it('ignores legacy terminal state in localStorage on mount', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        status: 'success',
        submissionResult: { success: true },
        verifier: { name: 'stale-verifier', verified: true },
      })
    )

    render(
      <PresentationProvider>
        <PresentationProbe />
      </PresentationProvider>
    )

    expect(screen.getByTestId('status').textContent).toBe('idle')
    expect(screen.getByTestId('verifier-name').textContent).toBe('')
  })

  it('rejects persisted state with invalid verifier shape on mount', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        status: 'selecting',
        verifier: { name: 12345, verified: true },
      })
    )

    render(
      <PresentationProvider>
        <PresentationProbe />
      </PresentationProvider>
    )

    expect(screen.getByTestId('status').textContent).toBe('idle')
  })

  it('stores session data via setStartResponse', async () => {
    render(
      <PresentationProvider>
        <SetterProbe />
      </PresentationProvider>
    )

    await act(async () => {
      screen.getByRole('button', { name: 'set-session' }).click()
    })

    expect(screen.getByTestId('session-id').textContent).toBe('prs_test_session_001')
  })

  it('stores credential matches via setStartResponse', async () => {
    render(
      <PresentationProvider>
        <SetterProbe />
      </PresentationProvider>
    )

    await act(async () => {
      screen.getByRole('button', { name: 'set-matches' }).click()
    })

    expect(screen.getByTestId('match-count').textContent).toBe('1')
  })

  it('stores disclosure map via setDisclosedClaims', async () => {
    render(
      <PresentationProvider>
        <SetterProbe />
      </PresentationProvider>
    )

    await act(async () => {
      screen.getByRole('button', { name: 'set-disclosures' }).click()
    })

    expect(screen.getByTestId('disclosure-keys').textContent).toBe('cred-1')
  })

  it('advances status through multiple in-progress steps', async () => {
    render(
      <PresentationProvider>
        <SetterProbe />
      </PresentationProvider>
    )

    await act(async () => {
      screen.getByRole('button', { name: 'advance-status' }).click()
    })

    expect(screen.getByTestId('status').textContent).toBe('selecting')
    expect(localStorage.getItem(STORAGE_KEY)).toContain('selecting')
  })

  it('maps failed submission to submission_failed error', async () => {
    render(
      <PresentationProvider>
        <SubmissionFailureProbe />
      </PresentationProvider>
    )

    await act(async () => {
      screen.getByRole('button', { name: 'submit-fail' }).click()
    })

    expect(screen.getByTestId('status').textContent).toBe('error')
    expect(screen.getByTestId('error-code').textContent).toBe('submission_failed')
  })

  it('setStartResponse clears credentials and results from a previous flow', async () => {
    render(
      <PresentationProvider>
        <SetterProbe />
      </PresentationProvider>
    )

    await act(async () => {
      screen.getByRole('button', { name: 'new-session' }).click()
    })

    expect(screen.getByTestId('session-id').textContent).toBe('prs_new_session')
    expect(screen.getByTestId('selected-count').textContent).toBe('0')
    expect(screen.getByTestId('disclosure-keys').textContent).toBe('')
  })

  it('setStartResponse clears prior selection and disclosures', async () => {
    render(
      <PresentationProvider>
        <SetterProbe />
      </PresentationProvider>
    )

    await act(async () => {
      screen.getByRole('button', { name: 'refresh-matches' }).click()
    })

    expect(screen.getByTestId('match-count').textContent).toBe('1')
    expect(screen.getByTestId('selected-count').textContent).toBe('0')
    expect(screen.getByTestId('disclosure-keys').textContent).toBe('')
  })
})
