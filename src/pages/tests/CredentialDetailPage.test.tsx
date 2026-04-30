// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../constants/routes'
import { CredentialDetailPage } from '../CredentialDetailPage'
import { useCredentialDetail } from '../../hooks/useCredentialDetail'
import type { CredentialRecord } from '../../types/credential'

vi.mock('../../hooks/useCredentialDetail', () => ({
  useCredentialDetail: vi.fn(),
}))

const mockedUseCredentialDetail = vi.mocked(useCredentialDetail)

function sampleCredential(overrides: Partial<CredentialRecord> = {}): CredentialRecord {
  return {
    id: 'cred-1',
    credential_configuration_id: 'eu.europa.ec.eudi.pid.1',
    format: 'dc+sd-jwt',
    issuer: 'https://issuer.example.org',
    status: 'active',
    issued_at: '2026-04-08T14:35:00Z',
    expires_at: null,
    claims: {
      given_name: 'Jane',
      family_name: 'Doe',
      id: '12345',
    },
    ...overrides,
  }
}

describe('CredentialDetailPage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
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

  it('redirects to credentials route when credential id param is missing', () => {
    mockedUseCredentialDetail.mockReturnValue({
      credential: null,
      loading: false,
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/unknown']}>
        <Routes>
          <Route path="*" element={<CredentialDetailPage />} />
          <Route path={routes.credentials} element={<div>Credentials list</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Credentials list')).toBeDefined()
  })

  it('renders loading state while detail hook is pending', () => {
    mockedUseCredentialDetail.mockReturnValue({
      credential: null,
      loading: true,
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/credentials/cred-1']}>
        <Routes>
          <Route path={`${routes.credentials}/:credentialId`} element={<CredentialDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Loading…')).toBeDefined()
  })

  it('renders error state and navigates back to credentials', () => {
    mockedUseCredentialDetail.mockReturnValue({
      credential: null,
      loading: false,
      error: new Error('Detail fetch failed'),
    })

    render(
      <MemoryRouter initialEntries={['/credentials/cred-1']}>
        <Routes>
          <Route path={`${routes.credentials}/:credentialId`} element={<CredentialDetailPage />} />
          <Route path={routes.credentials} element={<div>Credentials list</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Could not open this credential.')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Back to Credentials' }))
    expect(screen.getByText('Credentials list')).toBeDefined()
  })

  it('reveals and hides fields individually and via show-all toggle', () => {
    mockedUseCredentialDetail.mockReturnValue({
      credential: sampleCredential(),
      loading: false,
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/credentials/cred-1']}>
        <Routes>
          <Route path={`${routes.credentials}/:credentialId`} element={<CredentialDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Initially hidden
    expect(screen.getByLabelText('Given Name hidden')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Show Given Name' }))
    expect(screen.getByLabelText('Jane')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Hide Given Name' }))
    expect(screen.getByLabelText('Given Name hidden')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Show all fields' }))
    expect(screen.getByRole('button', { name: 'Hide all fields' })).toBeDefined()
    expect(screen.getByLabelText('Doe')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Hide all fields' }))
    expect(screen.getByLabelText('Family Name hidden')).toBeDefined()
  })

  it('renders object claim values as formatted JSON strings when revealed', () => {
    mockedUseCredentialDetail.mockReturnValue({
      credential: sampleCredential({
        claims: {
          address: { street: 'Main', city: 'Berlin' },
        },
      }),
      loading: false,
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/credentials/cred-1']}>
        <Routes>
          <Route path={`${routes.credentials}/:credentialId`} element={<CredentialDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Show Address' }))
    expect(screen.getByLabelText(/"street": "Main"/)).toBeDefined()
  })

  it('shows empty-details message when claims are empty', () => {
    mockedUseCredentialDetail.mockReturnValue({
      credential: sampleCredential({ claims: {} }),
      loading: false,
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/credentials/cred-1']}>
        <Routes>
          <Route path={`${routes.credentials}/:credentialId`} element={<CredentialDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('No details available for this credential.')).toBeDefined()
  })

  it('renders em-dash for null claim values when revealed', () => {
    mockedUseCredentialDetail.mockReturnValue({
      credential: sampleCredential({ claims: { middle_name: null } }),
      loading: false,
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/credentials/cred-1']}>
        <Routes>
          <Route path={`${routes.credentials}/:credentialId`} element={<CredentialDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Show Middle Name' }))
    expect(screen.getByLabelText('—')).toBeDefined()
  })

  it('navigates back from header control', () => {
    mockedUseCredentialDetail.mockReturnValue({
      credential: sampleCredential(),
      loading: false,
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/credentials/cred-1']}>
        <Routes>
          <Route path={`${routes.credentials}/:credentialId`} element={<CredentialDetailPage />} />
          <Route path={routes.credentials} element={<div>Credentials list</div>} />
        </Routes>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back to credentials' }))
    expect(screen.getByText('Credentials list')).toBeDefined()
  })
})
