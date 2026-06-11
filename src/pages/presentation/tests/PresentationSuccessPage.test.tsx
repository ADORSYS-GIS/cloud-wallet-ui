// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../../constants/routes'
import { PresentationSuccessPage } from '../PresentationSuccessPage'

const mockClear = vi.fn()
let mockPresentationStatus = 'idle'

vi.mock('../../../state/presentation.state', () => ({
  usePresentationState: () => ({
    status: mockPresentationStatus,
    clear: mockClear,
  }),
}))

describe('PresentationSuccessPage', () => {
  beforeEach(() => {
    mockPresentationStatus = 'idle'
    mockClear.mockReset()
  })

  it('redirects to home when presentation is not successful', () => {
    render(
      <MemoryRouter initialEntries={[routes.presentationSuccess]}>
        <Routes>
          <Route
            path={routes.presentationSuccess}
            element={<PresentationSuccessPage />}
          />
          <Route path={routes.home} element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Home')).toBeTruthy()
  })

  it('shows success message and clears state on go home', async () => {
    mockPresentationStatus = 'success'
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[routes.presentationSuccess]}>
        <Routes>
          <Route
            path={routes.presentationSuccess}
            element={<PresentationSuccessPage />}
          />
          <Route path={routes.home} element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Information sent successfully')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Go back home' }))
    expect(mockClear).toHaveBeenCalledTimes(1)
  })
})
