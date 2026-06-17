// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../constants/routes'
import { PresentationActivityDetailPage } from '../PresentationActivityDetailPage'

vi.mock('../../hooks/usePresentationActivityDetail', () => ({
  usePresentationActivityDetail: vi.fn(),
}))

import { usePresentationActivityDetail } from '../../hooks/usePresentationActivityDetail'

const mockUseDetail = vi.mocked(usePresentationActivityDetail)

const activityId = 'a1111111-1111-4111-8111-111111111111'

const record = {
  id: activityId,
  presented_at: '2026-06-01T10:00:00Z',
  verifier: {
    client_id:
      'x509_hash:eyJhbGciOiJFUzI1NiIsImtpZCI6IjEifQ.eyJzdWIiOiJ2ZXJpZmllciJ9.sig',
    name: 'Keycloak-demo Solution Adorsys',
    logo_uri: null,
  },
  credential_types: ['eu.europa.ec.eudi.pid.1'],
  disclosed_claim_count: 3,
}

function renderPage(path = `/activity/${activityId}`) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={routes.presentationActivityDetail}
          element={<PresentationActivityDetailPage />}
        />
        <Route path={routes.presentationActivity} element={<div>Activity list</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('PresentationActivityDetailPage', () => {
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

  it('redirects to the activity list when the activity id is invalid', () => {
    mockUseDetail.mockReturnValue({
      record: null,
      loading: false,
      errorMessage: null,
      deleting: false,
      forget: vi.fn(),
      clearError: vi.fn(),
    })

    renderPage('/activity/not-a-uuid')

    expect(screen.getByText('Activity list')).toBeDefined()
  })

  it('renders a loading state while the record is fetched', () => {
    mockUseDetail.mockReturnValue({
      record: null,
      loading: true,
      errorMessage: null,
      deleting: false,
      forget: vi.fn(),
      clearError: vi.fn(),
    })

    renderPage()

    expect(screen.getByText('Loading…')).toBeDefined()
  })

  it('shows an error banner when detail loading fails', () => {
    mockUseDetail.mockReturnValue({
      record: null,
      loading: false,
      errorMessage:
        'This presentation record could not be found. It may have been removed or expired.',
      deleting: false,
      forget: vi.fn(),
      clearError: vi.fn(),
    })

    renderPage()

    expect(
      screen.getByText(
        'This presentation record could not be found. It may have been removed or expired.'
      )
    ).toBeDefined()
    expect(screen.getByRole('alert')).toBeDefined()
  })

  it('clears the error banner when dismiss is clicked', () => {
    const clearError = vi.fn()

    mockUseDetail.mockReturnValue({
      record: null,
      loading: false,
      errorMessage: 'Could not load presentation details. Please try again.',
      deleting: false,
      forget: vi.fn(),
      clearError,
    })

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss error' }))
    expect(clearError).toHaveBeenCalledTimes(1)
  })

  it('renders shared claims layout when a record is loaded', () => {
    mockUseDetail.mockReturnValue({
      record,
      loading: false,
      errorMessage: null,
      deleting: false,
      forget: vi.fn(),
      clearError: vi.fn(),
    })

    renderPage()

    expect(screen.getByText('Shared Claims')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Back to activity' })).toBeDefined()
    expect(screen.getByText('Identity Credential')).toBeDefined()
    expect(screen.getByText('Keycloak-demo Solution Adorsys')).toBeDefined()
    expect(
      screen.getAllByText('DATEV Unternehmensdaten für E-Rechnungsprozesse').length
    ).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Show All' })).toBeDefined()
  })

  it('toggles description expansion without showing verifier metadata', () => {
    mockUseDetail.mockReturnValue({
      record,
      loading: false,
      errorMessage: null,
      deleting: false,
      forget: vi.fn(),
      clearError: vi.fn(),
    })

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Show All' }))
    expect(screen.getByRole('button', { name: 'Show Less' })).toBeDefined()
    expect(screen.queryByText(/Credential types:/)).toBeNull()
    expect(screen.queryByText(/Verifier:/)).toBeNull()
    expect(screen.queryByText(/Claims shared:/)).toBeNull()
  })
})
