// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../constants/routes'
import { useCredentials } from '../../hooks/useCredentials'
import { CredentialsPage } from '../CredentialsPage'
import type { CredentialRecord } from '../../types/credential'

vi.mock('../../hooks/useCredentials', () => ({
  useCredentials: vi.fn(),
}))

const mockedUseCredentials = vi.mocked(useCredentials)

function makeCredential(overrides: Partial<CredentialRecord> = {}): CredentialRecord {
  return {
    id: 'cred-1',
    credential_configuration_id: 'https://credentials.example.com/identity/mDL',
    format: 'dc+sd-jwt',
    issuer: 'https://issuer.example.com',
    status: 'active',
    issued_at: '2026-04-08T14:35:00Z',
    expires_at: null,
    claims: { given_name: 'Jane', family_name: 'Doe' },
    ...overrides,
  }
}

describe('CredentialsPage', () => {
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

  it('renders credentials list using the last segment of credential_configuration_id as title', () => {
    mockedUseCredentials.mockReturnValue({
      loading: false,
      credentials: [
        makeCredential({
          id: 'cred-1',
          credential_configuration_id: 'https://credentials.example.com/identity/mDL',
          issuer: 'https://issuer.example.com',
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
    expect(screen.getByRole('button', { name: /mDL/i })).toBeDefined()
    expect(screen.getByText('issuer.example.com')).toBeDefined()
  })

  it('renders a dot-notation credential_configuration_id in full when there are no path segments', () => {
    mockedUseCredentials.mockReturnValue({
      loading: false,
      credentials: [
        makeCredential({
          id: 'cred-2',
          credential_configuration_id: 'eu.europa.ec.eudi.pid.1',
          issuer: 'https://issuer.example.eu',
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

    expect(
      screen.getByRole('button', { name: /eu\.europa\.ec\.eudi\.pid\.1/i })
    ).toBeDefined()
  })

  it('navigates to credential details when a credential card is tapped', () => {
    mockedUseCredentials.mockReturnValue({
      loading: false,
      credentials: [
        makeCredential({
          id: 'cred-1',
          credential_configuration_id: 'https://credentials.example.com/identity/mDL',
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

    fireEvent.click(screen.getByRole('button', { name: /mDL/i }))

    expect(screen.getByText('Credential details view')).toBeDefined()
  })
})
