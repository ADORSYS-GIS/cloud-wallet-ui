// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PresentationErrorPage } from '../PresentationErrorPage'
import { routes } from '../../../constants/routes'
import type { PresentationError } from '../../../types/presentation'

const mockNavigate = vi.fn()
const mockClear = vi.fn()

let mockPresentationStatus = 'error'
let mockPresentationError: PresentationError | undefined = {
  code: 'no_matching_credentials',
  message: 'No credentials matched',
  httpStatus: 400,
}

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../../state/presentation.state', () => ({
  usePresentationState: () => ({
    status: mockPresentationStatus,
    error: mockPresentationError,
    clear: mockClear,
  }),
}))

vi.mock('../../../components/presentation/PresentationPageShell', () => ({
  PresentationPageShell: ({
    title,
    onBack,
    children,
  }: {
    title: string
    onBack: () => void
    children: React.ReactNode
  }) => (
    <div>
      <h1>{title}</h1>
      <button type="button" onClick={onBack}>
        Back
      </button>
      {children}
    </div>
  ),
}))

function renderPage(state?: { retryPath?: string }) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: routes.presentationError,
          state,
        },
      ]}
    >
      <Routes>
        <Route path={routes.presentationError} element={<PresentationErrorPage />} />
        <Route path={routes.home} element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('PresentationErrorPage', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    mockNavigate.mockReset()
    mockClear.mockReset()
    mockPresentationStatus = 'error'
    mockPresentationError = {
      code: 'no_matching_credentials',
      message: 'No credentials matched',
      httpStatus: 400,
    }
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('redirects home when there is no presentation error', () => {
    mockPresentationStatus = 'idle'
    mockPresentationError = undefined
    renderPage()
    expect(screen.getByText('Home')).toBeTruthy()
  })

  it('shows unsupported credential messaging', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Credential not available' })).toBeTruthy()
    expect(
      screen.getByText(/don't have a credential that meets this proof request/i)
    ).toBeTruthy()
  })

  it('shows network error with retry when retryPath is provided', () => {
    mockPresentationError = {
      code: 'request_uri_fetch_failed',
      message: 'fetch failed',
      httpStatus: 502,
    }
    renderPage({ retryPath: `${routes.present}?client_id=test` })

    expect(screen.getByRole('heading', { name: 'Connection problem' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })

  it('clears state and returns home from Return to Wallet', async () => {
    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Return to Wallet' }))
    expect(mockClear).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith(routes.home, { replace: true })
  })

  it('clears state and navigates to scan on Start over', async () => {
    mockPresentationError = {
      code: 'invalid_request',
      message: 'bad request',
      httpStatus: 400,
    }
    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Start over' }))
    expect(mockClear).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith(`${routes.scan}?fresh=true`, {
      replace: true,
    })
  })

  it('logs the error for debugging', () => {
    const consoleSpy = vi.spyOn(console, 'error')
    renderPage()
    expect(consoleSpy).toHaveBeenCalledWith(
      '[PresentationError]',
      expect.objectContaining({
        code: 'no_matching_credentials',
        variant: 'unsupported_credential',
      })
    )
  })
})
