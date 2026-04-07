// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CredentialTypesPage } from '../CredentialTypesPage'
import { routes } from '../../constants/routes'
import type { CredentialOfferResolutionResponse } from '../../types/credentialOffer'
import type {
  CredentialOfferStatus,
  CredentialOfferUiError,
} from '../../state/credentialOffer'

const mockNavigate = vi.fn()

type MockState = {
  status: CredentialOfferStatus
  offer?: CredentialOfferResolutionResponse
  error?: CredentialOfferUiError
  setLoading: () => void
  setOffer: (offer: CredentialOfferResolutionResponse) => void
  setError: (error: CredentialOfferUiError) => void
  clear: () => void
}

const mockOfferState: MockState = {
  status: 'success',
  offer: undefined,
  error: undefined,
  setLoading: vi.fn(),
  setOffer: vi.fn(),
  setError: vi.fn(),
  clear: vi.fn(),
}

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../../state/credentialOffer', () => ({
  useCredentialOfferState: () => mockOfferState,
}))

vi.mock('../../components/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <CredentialTypesPage />
    </MemoryRouter>
  )
}

describe('CredentialTypesPage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    mockNavigate.mockReset()
    mockOfferState.status = 'success'
    mockOfferState.error = undefined
    mockOfferState.offer = {
      issuer: {
        name: 'Keycloak-demo',
        logoUrl: 'https://issuer.example.org/logo.png',
        url: 'https://issuer.example.org',
      },
      credentialTypes: ['Identity Credential', 'Address Credential'],
      options: [
        { id: 'pid', displayName: 'Personal ID' },
        { id: 'address', displayName: 'Address Credential' },
      ],
    }
  })

  it('renders credential options from offer.options', () => {
    renderPage()

    expect(screen.getByText('Personal ID')).toBeTruthy()
    expect(screen.getByText('Address Credential')).toBeTruthy()
    expect(screen.queryByText('Identity Credential')).toBeNull()
  })

  it('falls back to credentialTypes when options are not returned', () => {
    mockOfferState.offer = {
      issuer: {
        name: 'Issuer A',
      },
      credentialTypes: ['Type A', 'Type B'],
    }

    renderPage()

    expect(screen.getByText('Type A')).toBeTruthy()
    expect(screen.getByText('Type B')).toBeTruthy()
  })

  it('allows selecting exactly one credential option visually', async () => {
    const user = userEvent.setup()
    renderPage()

    const personalId = screen.getByText('Personal ID').closest('button')
    const address = screen.getByText('Address Credential').closest('button')

    expect(personalId).toBeTruthy()
    expect(address).toBeTruthy()
    if (!personalId || !address) {
      return
    }

    expect(personalId.getAttribute('aria-pressed')).toBe('false')
    expect(address.getAttribute('aria-pressed')).toBe('false')

    await user.click(personalId)
    expect(personalId.getAttribute('aria-pressed')).toBe('true')
    expect(address.getAttribute('aria-pressed')).toBe('false')

    await user.click(address)
    expect(personalId.getAttribute('aria-pressed')).toBe('false')
    expect(address.getAttribute('aria-pressed')).toBe('true')
  })

  it('shows issuer logo when provided by backend', () => {
    renderPage()

    const logos = screen.getAllByRole('img', { name: /Keycloak-demo logo/i })
    expect(logos.length).toBeGreaterThan(0)
    expect(logos[0]?.getAttribute('src')).toBe('https://issuer.example.org/logo.png')
  })

  it('shows safe fallback when issuer logo is missing', () => {
    mockOfferState.offer = {
      issuer: {},
      credentialTypes: ['Type A'],
    }

    const { container } = renderPage()
    expect(screen.getByText('Unknown issuer')).toBeTruthy()
    expect(screen.queryAllByRole('img', { name: /logo/i }).length).toBe(0)
    expect(container.querySelector('.bg-slate-100')).toBeTruthy()
  })

  it('redirects to scan page when offer is unavailable', async () => {
    mockOfferState.offer = undefined

    renderPage()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(routes.scan, { replace: true })
    })
  })
})
