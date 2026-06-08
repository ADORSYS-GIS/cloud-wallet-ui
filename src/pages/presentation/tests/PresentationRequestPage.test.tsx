// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PresentationRequestPage } from '../PresentationRequestPage'
import { routes } from '../../../constants/routes'
import type { PresentationSessionState } from '../../../hooks/presentation/usePresentationSession'

const mockNavigate = vi.fn()
const mockStartRequest = vi.fn()
const mockReset = vi.fn()

let mockSessionState: PresentationSessionState = { status: 'idle' }
let mockPresentationStatus = 'idle'

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../../hooks/presentation/usePresentationSession', () => ({
  usePresentationSession: () => ({
    sessionState: mockSessionState,
    startRequest: mockStartRequest,
    reset: mockReset,
  }),
}))

vi.mock('../../../state/presentation.state', () => ({
  usePresentationState: () => ({
    status: mockPresentationStatus,
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

const validSearch =
  '?client_id=https%3A%2F%2Fverifier.example' +
  '&request_uri=https%3A%2F%2Fverifier.example%2Frequest' +
  '&response_type=vp_token' +
  '&nonce=nonce-123' +
  '&scope=openid'

function renderPage(search = validSearch) {
  return render(
    <MemoryRouter initialEntries={[`${routes.present}${search}`]}>
      <Routes>
        <Route path={routes.present} element={<PresentationRequestPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('PresentationRequestPage', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    mockNavigate.mockReset()
    mockStartRequest.mockReset()
    mockReset.mockReset()
    mockSessionState = { status: 'idle' }
    mockPresentationStatus = 'idle'
  })

  it('shows validation error when query params are missing', () => {
    renderPage('')
    expect(screen.getByText(/Missing required parameter: client_id/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Scan QR code' })).toBeTruthy()
    expect(mockStartRequest).not.toHaveBeenCalled()
  })

  it('starts the presentation session for valid query params', async () => {
    renderPage()
    await waitFor(() => {
      expect(mockStartRequest).toHaveBeenCalledTimes(1)
    })
  })

  it('shows loading state while the session is starting', () => {
    mockSessionState = { status: 'loading' }
    renderPage()
    expect(screen.getByText('Processing proof request…')).toBeTruthy()
  })

  it('shows API error with retry action', async () => {
    mockSessionState = {
      status: 'error',
      error: {
        httpStatus: 404,
        code: 'invalid_presentation_request',
        message: 'POST /presentation/start failed with 404',
      },
    }
    renderPage()

    expect(
      screen.getByText(
        'This presentation request is invalid or has expired. Please ask the verifier for a new QR code.'
      )
    ).toBeTruthy()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(mockReset).toHaveBeenCalled()
    expect(mockStartRequest).toHaveBeenCalled()
  })

  it('does not start a duplicate request when the flow is already in progress', async () => {
    mockPresentationStatus = 'loading'
    renderPage()

    await waitFor(() => {
      expect(mockStartRequest).not.toHaveBeenCalled()
    })
  })

  it('resets and returns home when back is pressed', async () => {
    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(mockReset).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith(routes.home)
  })
})
