// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PresentationActivityPage } from '../PresentationActivityPage'

vi.mock('../../hooks/usePresentationActivity', () => ({
  usePresentationActivity: vi.fn(),
}))

import { usePresentationActivity } from '../../hooks/usePresentationActivity'

const mockUsePresentationActivity = vi.mocked(usePresentationActivity)

describe('PresentationActivityPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('renders empty state when there are no records', () => {
    mockUsePresentationActivity.mockReturnValue({
      items: [],
      loading: false,
      loadingMore: false,
      errorMessage: null,
      hasMore: false,
      filters: { from: '', to: '', verifierName: '' },
      setFilters: vi.fn(),
      loadMore: vi.fn(),
      removeItem: vi.fn(),
      reportError: vi.fn(),
      clearError: vi.fn(),
    })

    render(
      <MemoryRouter>
        <PresentationActivityPage />
      </MemoryRouter>
    )

    expect(screen.getByText('There is no past activity to show.')).toBeDefined()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Activity History' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull()
  })

  it('hides empty state when load failed with an error message', () => {
    mockUsePresentationActivity.mockReturnValue({
      items: [],
      loading: false,
      loadingMore: false,
      errorMessage:
        'Activity history is not available right now. Try again later or contact your administrator if this continues.',
      hasMore: false,
      filters: { from: '', to: '', verifierName: '' },
      setFilters: vi.fn(),
      loadMore: vi.fn(),
      removeItem: vi.fn(),
      reportError: vi.fn(),
      clearError: vi.fn(),
    })

    render(
      <MemoryRouter>
        <PresentationActivityPage />
      </MemoryRouter>
    )

    expect(screen.queryByText('There is no past activity to show.')).toBeNull()
    expect(
      screen.getByText(
        'Activity history is not available right now. Try again later or contact your administrator if this continues.'
      )
    ).toBeDefined()
  })
})
