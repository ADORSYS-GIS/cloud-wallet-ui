// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PresentationProvider, usePresentationState } from '../presentation.state'

const STORAGE_KEY = 'cloud_wallet_presentation_flow'

const startResponse = {
  session_id: 'prs_test_session',
  expires_at: '2026-04-08T14:35:00Z',
  flow: 'cross_device' as const,
  verifier: {
    name: 'Example Relying Party',
    verified: true,
  },
  purpose: 'Age verification.',
  credential_matches: [
    {
      query_id: 'pid_request',
      required: true,
      candidates: [
        {
          credential_id: 'cred-1',
          display: { name: 'EU Personal ID' },
          requested_claims: [{ path: ['family_name'] }],
        },
      ],
    },
  ],
  requires_consent: true,
}

function PresentationProbe() {
  const state = usePresentationState()
  return (
    <div>
      <span data-testid="status">{state.status}</span>
      <span data-testid="session-id">{state.sessionId ?? ''}</span>
      <span data-testid="verifier-name">{state.verifier?.name ?? ''}</span>
      <span data-testid="flow-active">{String(state.isFlowActive)}</span>
      <button
        type="button"
        onClick={() =>
          state.setSession(startResponse, 'x509_san_dns:verifier.example.org')
        }
      >
        start
      </button>
      <button
        type="button"
        onClick={() =>
          state.setConsentResponse({
            status: 'completed',
            redirect_uri: null,
            verifier_response: null,
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
      <span data-testid="match-count">
        {String(state.credentialMatches?.length ?? 0)}
      </span>
      <span data-testid="selected-count">
        {String(state.selectedCredentials?.length ?? 0)}
      </span>
      <button
        type="button"
        onClick={() =>
          state.setSelectedCredentials([
            { query_id: 'pid_request', credential_id: 'cred-1' },
          ])
        }
      >
        select
      </button>
      <button
        type="button"
        onClick={() => {
          state.setSession(startResponse, 'verifier-client')
          state.setSelectedCredentials([
            { query_id: 'pid_request', credential_id: 'cred-1' },
          ])
        }}
      >
        new-session
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
    expect(screen.getByTestId('session-id').textContent).toBe('prs_test_session')
    expect(localStorage.getItem(STORAGE_KEY)).toContain('selecting')

    unmount()

    render(
      <PresentationProvider>
        <PresentationProbe />
      </PresentationProvider>
    )

    expect(screen.getByTestId('status').textContent).toBe('selecting')
    expect(screen.getByTestId('verifier-name').textContent).toBe('Example Relying Party')
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

    await act(async () => {
      screen.getByRole('button', { name: 'complete' }).click()
    })

    expect(screen.getByTestId('status').textContent).toBe('success')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('stores selected credentials', async () => {
    render(
      <PresentationProvider>
        <SetterProbe />
      </PresentationProvider>
    )

    await act(async () => {
      screen.getByRole('button', { name: 'select' }).click()
    })

    expect(screen.getByTestId('selected-count').textContent).toBe('1')
  })

  it('setSession clears prior selections', async () => {
    render(
      <PresentationProvider>
        <SetterProbe />
      </PresentationProvider>
    )

    await act(async () => {
      screen.getByRole('button', { name: 'new-session' }).click()
    })

    expect(screen.getByTestId('match-count').textContent).toBe('1')
    expect(screen.getByTestId('selected-count').textContent).toBe('1')
  })
})
