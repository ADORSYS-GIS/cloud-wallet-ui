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
      <button type="button" onClick={() => state.clear()}>
        clear
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

  it('auto-clears after successful completion without persisting terminal state', async () => {
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

    expect(screen.getByTestId('status').textContent).toBe('idle')
    expect(screen.getByTestId('client-id').textContent).toBe('')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('auto-clears after error without persisting terminal state', async () => {
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

    expect(screen.getByTestId('status').textContent).toBe('idle')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
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
})
