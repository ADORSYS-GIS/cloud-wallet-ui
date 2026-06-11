// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../../constants/routes'
import { PresentationRejectedPage } from '../PresentationRejectedPage'

const mockClear = vi.fn()
let mockPresentationStatus = 'idle'

vi.mock('../../../state/presentation.state', () => ({
  usePresentationState: () => ({
    status: mockPresentationStatus,
    clear: mockClear,
  }),
}))

describe('PresentationRejectedPage', () => {
  beforeEach(() => {
    mockPresentationStatus = 'idle'
    mockClear.mockReset()
  })

  it('redirects to home when presentation is not rejected', () => {
    render(
      <MemoryRouter initialEntries={[routes.presentationRejected]}>
        <Routes>
          <Route path={routes.presentationRejected} element={<PresentationRejectedPage />} />
          <Route path={routes.home} element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Home')).toBeTruthy()
  })

  it('shows rejection message and clears state on go home', async () => {
    mockPresentationStatus = 'rejected'
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[routes.presentationRejected]}>
        <Routes>
          <Route path={routes.presentationRejected} element={<PresentationRejectedPage />} />
          <Route path={routes.home} element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Presentation declined')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Go back home' }))
    expect(mockClear).toHaveBeenCalledTimes(1)
  })
})
