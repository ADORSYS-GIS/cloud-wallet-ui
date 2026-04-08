// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../constants/routes'
import { useCredentials } from '../../hooks/useCredentials'
import { CredentialsPage } from '../CredentialsPage'

vi.mock('../../hooks/useCredentials', () => ({
  useCredentials: vi.fn(),
}))

const mockedUseCredentials = vi.mocked(useCredentials)

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
      items: [],
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

  it('renders credentials list when credentials are available', () => {
    mockedUseCredentials.mockReturnValue({
      loading: false,
      items: [
        {
          id: 'cred-1',
          issuer: 'https://issuer.example.com',
          credential_type: 'https://credentials.example.com/identity/mDL',
          display_name: 'Mobile Driving Licence',
        },
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
    expect(screen.getByRole('button', { name: /Mobile Driving Licence/i })).toBeDefined()
    expect(screen.getByText('issuer.example.com')).toBeDefined()
  })

  it('navigates to credential details when a credential card is tapped', () => {
    mockedUseCredentials.mockReturnValue({
      loading: false,
      items: [
        {
          id: 'cred-1',
          issuer: 'https://issuer.example.com',
          credential_type: 'https://credentials.example.com/identity/mDL',
          display_name: 'Mobile Driving Licence',
        },
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

    fireEvent.click(screen.getByRole('button', { name: /Mobile Driving Licence/i }))

    expect(screen.getByText('Credential details view')).toBeDefined()
  })
})
