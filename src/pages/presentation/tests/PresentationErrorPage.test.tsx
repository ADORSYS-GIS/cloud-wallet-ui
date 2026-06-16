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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[routes.presentationError]}>
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

  it('shows variant-specific messaging in a single block', () => {
    renderPage()
    expect(screen.getByText(/Credential not available/i)).toBeTruthy()
    expect(
      screen.getByText(/don't have a credential that meets this proof request/i)
    ).toBeTruthy()
  })

  it('shows a single Scan again action like the issuance error flow', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Scan again' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Start over' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Return to Wallet' })).toBeNull()
  })

  it('clears state and navigates to scan when Scan again is pressed', async () => {
    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Scan again' }))
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
