// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../constants/routes'
import { useCredentials } from '../../hooks/useCredentials'
import {
  clearRemovedCredentials,
  markCredentialRemoved,
} from '../../state/deletedCredentials'
import { CredentialsPage } from '../CredentialsPage'
import type { CredentialListItem } from '../../types/credential'

vi.mock('../../hooks/useCredentials', () => ({
  useCredentials: vi.fn(),
}))

const mockedUseCredentials = vi.mocked(useCredentials)

function makeCredential(overrides: Partial<CredentialListItem> = {}): CredentialListItem {
  return {
    id: 'cred-1',
    display: {
      name: 'mDL',
      description: 'Mobile Driver License',
      issuer_name: 'issuer.example.com',
      credential_type: 'https://credentials.example.com/identity/mDL',
      logo: null,
    },
    issued_at: '2026-04-08T14:35:00Z',
    ...overrides,
  }
}

describe('CredentialsPage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    clearRemovedCredentials()
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

  it('renders empty state copy and CTA when there are no credentials', () => {
    mockedUseCredentials.mockReturnValue({
      credentials: [],
      loading: false,
    })

    render(
      <MemoryRouter initialEntries={[routes.credentials]}>
        <Routes>
          <Route path={routes.credentials} element={<CredentialsPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Your wallet is empty.')).toBeDefined()
    expect(
      screen.getByText(
        'Scan the QR code and fill your EUDI Cloud Wallet with proof of your digital identity.'
      )
    ).toBeDefined()
    expect(
      screen.getByRole('button', { name: 'Add your first Credential' })
    ).toBeDefined()
  })

  it('navigates to scan page when empty-state CTA is clicked', () => {
    mockedUseCredentials.mockReturnValue({
      credentials: [],
      loading: false,
    })

    render(
      <MemoryRouter initialEntries={[routes.credentials]}>
        <Routes>
          <Route path={routes.credentials} element={<CredentialsPage />} />
          <Route path={routes.scan} element={<div>Scan page</div>} />
        </Routes>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add your first Credential' }))
    expect(screen.getByText('Scan page')).toBeDefined()
  })

  it('renders credentials list using display name and issuer_name from API', () => {
    mockedUseCredentials.mockReturnValue({
      loading: false,
      credentials: [
        makeCredential({
          id: 'cred-1',
          display: {
            name: 'Mobile Driver License',
            issuer_name: 'issuer.example.com',
            credential_type: 'https://credentials.example.com/identity/mDL',
          },
        }),
      ],
    })

    render(
      <MemoryRouter initialEntries={[routes.credentials]}>
        <Routes>
          <Route path={routes.credentials} element={<CredentialsPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByText('Your wallet is empty.')).toBeNull()
    expect(screen.getByRole('button', { name: /Mobile Driver License/i })).toBeDefined()
    expect(screen.getByText('issuer.example.com')).toBeDefined()
  })

  it('renders credential using display name from API response', () => {
    mockedUseCredentials.mockReturnValue({
      loading: false,
      credentials: [
        makeCredential({
          id: 'cred-2',
          display: {
            name: 'EU Personal ID',
            issuer_name: 'Example EU Identity Authority',
            credential_type: 'eu.europa.ec.eudi.pid.1',
          },
        }),
      ],
    })

    render(
      <MemoryRouter initialEntries={[routes.credentials]}>
        <Routes>
          <Route path={routes.credentials} element={<CredentialsPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: /EU Personal ID/i })).toBeDefined()
  })

  it('navigates to credential details when a credential card is tapped', () => {
    mockedUseCredentials.mockReturnValue({
      loading: false,
      credentials: [
        makeCredential({
          id: 'cred-1',
          display: {
            name: 'Mobile Driver License',
          },
        }),
      ],
    })

    render(
      <MemoryRouter initialEntries={[routes.credentials]}>
        <Routes>
          <Route path={routes.credentials} element={<CredentialsPage />} />
          <Route
            path={`${routes.credentials}/:credentialId`}
            element={<div>Credential details view</div>}
          />
        </Routes>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /Mobile Driver License/i }))

    expect(screen.getByText('Credential details view')).toBeDefined()
  })

  it('shows loading state while credentials are being fetched', () => {
    mockedUseCredentials.mockReturnValue({
      loading: true,
      credentials: [],
    })

    render(
      <MemoryRouter initialEntries={[routes.credentials]}>
        <Routes>
          <Route path={routes.credentials} element={<CredentialsPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Loading credentials…')).toBeDefined()
  })

  it('navigates to home from header back button', () => {
    mockedUseCredentials.mockReturnValue({
      loading: false,
      credentials: [],
    })

    render(
      <MemoryRouter initialEntries={[routes.credentials]}>
        <Routes>
          <Route path={routes.credentials} element={<CredentialsPage />} />
          <Route path={routes.home} element={<div>Home page</div>} />
        </Routes>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back to home' }))
    expect(screen.getByText('Home page')).toBeDefined()
  })

  it('navigates to scan page from footer scan button', () => {
    mockedUseCredentials.mockReturnValue({
      loading: false,
      credentials: [],
    })

    render(
      <MemoryRouter initialEntries={[routes.credentials]}>
        <Routes>
          <Route path={routes.credentials} element={<CredentialsPage />} />
          <Route path={routes.scan} element={<div>Scan destination</div>} />
        </Routes>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Scan credential offer QR' }))
    expect(screen.getByText('Scan destination')).toBeDefined()
  })

  it('hides credential marked as removed in session without refetching', () => {
    markCredentialRemoved('cred-1')
    mockedUseCredentials.mockReturnValue({
      loading: false,
      credentials: [
        makeCredential({ id: 'cred-1' }),
        makeCredential({
          id: 'cred-2',
          display: {
            name: 'EU Personal ID',
            credential_type: 'eu.europa.ec.eudi.pid.1',
          },
        }),
      ],
    })

    render(
      <MemoryRouter initialEntries={[routes.credentials]}>
        <Routes>
          <Route path={routes.credentials} element={<CredentialsPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByRole('button', { name: /mDL/i })).toBeNull()
    expect(screen.getByRole('button', { name: /EU Personal ID/i })).toBeDefined()
  })
})
