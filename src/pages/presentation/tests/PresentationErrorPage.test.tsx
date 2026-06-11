// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../../constants/routes'
import { PresentationErrorPage } from '../PresentationErrorPage'

const mockClear = vi.fn()
let mockPresentationStatus = 'idle'
let mockPresentationError:
  | {
      code: string
      message: string
      error_description?: string | null
    }
  | undefined

vi.mock('../../../state/presentation.state', () => ({
  usePresentationState: () => ({
    status: mockPresentationStatus,
    error: mockPresentationError,
    clear: mockClear,
  }),
}))

describe('PresentationErrorPage', () => {
  beforeEach(() => {
    mockPresentationStatus = 'idle'
    mockPresentationError = undefined
    mockClear.mockReset()
  })

  it('redirects to home when no error state is present', () => {
    render(
      <MemoryRouter initialEntries={[routes.presentationError]}>
        <Routes>
          <Route path={routes.presentationError} element={<PresentationErrorPage />} />
          <Route path={routes.home} element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Home')).toBeTruthy()
  })

  it('shows error message and retry for recoverable errors', async () => {
    mockPresentationStatus = 'error'
    mockPresentationError = {
      code: 'invalid_credential_selection',
      message: 'Test error',
      error_description: 'Something went wrong.',
    }
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[routes.presentationError]}>
        <Routes>
          <Route path={routes.presentationError} element={<PresentationErrorPage />} />
          <Route path={routes.scan} element={<div>Scan</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Something went wrong.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Scan QR code' }))
    expect(mockClear).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Scan')).toBeTruthy()
  })
})
