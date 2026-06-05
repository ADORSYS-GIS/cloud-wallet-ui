// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PresentationProvider, usePresentationState } from '../presentation.state'

const STORAGE_KEY = 'cloud_wallet_presentation_flow'

function PresentationProbe() {
  const state = usePresentationState()
  return (
    <div>
      <span data-testid="status">{state.status}</span>
      <span data-testid="client-id">{state.verifier?.client_id ?? ''}</span>
      <span data-testid="flow-active">{String(state.isFlowActive)}</span>
      <button
        type="button"
        onClick={() => {
          state.setStatus('selecting')
          state.setVerifier({ client_id: 'redirect_uri:https://verifier.example/cb' })
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
      <span data-testid="client-id">{state.request?.client_id ?? ''}</span>
      <span data-testid="match-count">
        {String(state.matchingCredentials?.length ?? 0)}
      </span>
      <span data-testid="selected-count">
        {String(state.selectedCredentials?.length ?? 0)}
      </span>
      <span data-testid="disclosure-keys">
        {Object.keys(state.disclosedClaims ?? {}).join(',')}
      </span>
      <button
        type="button"
        onClick={() =>
          state.setRequest({
            client_id: 'verifier-client',
            nonce: 'nonce-123',
            response_type: 'vp_token',
            response_mode: 'direct_post',
            scope: 'openid',
          })
        }
      >
        set-request
      </button>
      <button
        type="button"
        onClick={() =>
          state.setMatchingCredentials([
            {
              credentialId: 'cred-1',
              queryId: 'query-1',
              format: 'dc+sd-jwt',
            },
          ])
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
          state.setMatchingCredentials([
            { credentialId: 'cred-1', queryId: 'query-1', format: 'dc+sd-jwt' },
          ])
          state.setSelectedCredentials([
            { credentialId: 'cred-1', queryId: 'query-1', format: 'dc+sd-jwt' },
          ])
          state.setDisclosedClaims({ 'cred-1': ['given_name'] })
          state.setRequest({
            client_id: 'new-request',
            nonce: 'nonce-456',
            response_type: 'vp_token',
            response_mode: 'direct_post',
            scope: 'openid',
          })
        }}
      >
        new-request
      </button>
      <button
        type="button"
        onClick={() => {
          state.setSelectedCredentials([
            { credentialId: 'cred-1', queryId: 'query-1', format: 'dc+sd-jwt' },
          ])
          state.setDisclosedClaims({ 'cred-1': ['given_name'] })
          state.setMatchingCredentials([
            { credentialId: 'cred-2', queryId: 'query-2', format: 'dc+sd-jwt' },
          ])
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
    expect(screen.getByTestId('client-id').textContent).toBe(
      'redirect_uri:https://verifier.example/cb'
    )
    expect(localStorage.getItem(STORAGE_KEY)).toContain('selecting')

    unmount()

    render(
      <PresentationProvider>
        <PresentationProbe />
      </PresentationProvider>
    )

    expect(screen.getByTestId('status').textContent).toBe('selecting')
    expect(screen.getByTestId('client-id').textContent).toBe(
      'redirect_uri:https://verifier.example/cb'
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
        verifier: { client_id: 'stale-verifier' },
      })
    )

    render(
      <PresentationProvider>
        <PresentationProbe />
      </PresentationProvider>
    )

    expect(screen.getByTestId('status').textContent).toBe('idle')
    expect(screen.getByTestId('client-id').textContent).toBe('')
  })

  it('rejects persisted state with invalid verifier shape on mount', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        status: 'selecting',
        verifier: { client_id: 12345 },
      })
    )

    render(
      <PresentationProvider>
        <PresentationProbe />
      </PresentationProvider>
    )

    expect(screen.getByTestId('status').textContent).toBe('idle')
  })

  it('stores parsed request via setRequest', async () => {
    render(
      <PresentationProvider>
        <SetterProbe />
      </PresentationProvider>
    )

    await act(async () => {
      screen.getByRole('button', { name: 'set-request' }).click()
    })

    expect(screen.getByTestId('client-id').textContent).toBe('verifier-client')
  })

  it('stores matching credentials via setMatchingCredentials', async () => {
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

  it('setRequest clears credentials and results from a previous flow', async () => {
    render(
      <PresentationProvider>
        <SetterProbe />
      </PresentationProvider>
    )

    await act(async () => {
      screen.getByRole('button', { name: 'new-request' }).click()
    })

    expect(screen.getByTestId('client-id').textContent).toBe('new-request')
    expect(screen.getByTestId('match-count').textContent).toBe('0')
    expect(screen.getByTestId('selected-count').textContent).toBe('0')
    expect(screen.getByTestId('disclosure-keys').textContent).toBe('')
  })

  it('setMatchingCredentials clears prior selection and disclosures', async () => {
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
