// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CredentialTypesPage } from '../CredentialTypesPage'
import { routes } from '../../constants/routes'
import type { StartIssuanceResponse } from '../../types/issuance'
import type { CredentialOfferStatus } from '../../state/issuance.state'

const mockNavigate = vi.fn()

type MockState = {
  status: CredentialOfferStatus
  offer?: StartIssuanceResponse
  setLoading: () => void
  setOffer: (offer: StartIssuanceResponse) => void
  setError: () => void
  clear: () => void
}

const mockOfferState: MockState = {
  status: 'success',
  offer: undefined,
  setLoading: vi.fn(),
  setOffer: vi.fn(),
  setError: vi.fn(),
  clear: vi.fn(),
}

function baseOffer(
  overrides: Partial<StartIssuanceResponse> = {}
): StartIssuanceResponse {
  return {
    session_id: 'ses_test',
    expires_at: '2026-04-08T14:35:00Z',
    issuer: {
      credential_issuer: 'https://issuer.example.org',
      display_name: 'Keycloak-demo',
      logo_uri: 'https://issuer.example.org/logo.png',
    },
    credential_types: [
      {
        credential_configuration_id: 'pid',
        format: 'vc+sd-jwt',
        display: { name: 'Personal ID' },
      },
      {
        credential_configuration_id: 'address',
        format: 'vc+sd-jwt',
        display: { name: 'Address Credential' },
      },
    ],
    flow: 'pre_authorized_code',
    tx_code_required: false,
    tx_code: null,
    ...overrides,
  }
}

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../../state/issuance.state', () => ({
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
    mockOfferState.offer = baseOffer()
  })

  it('renders credential options from credential_types', () => {
    renderPage()

    expect(screen.getByText('Personal ID')).toBeTruthy()
    expect(screen.getByText('Address Credential')).toBeTruthy()
  })

  it('allows selecting exactly one credential option visually', async () => {
    const user = userEvent.setup()
    renderPage()

    const personalId = screen.getByText('Personal ID').closest('button')
    const address = screen.getByText('Address Credential').closest('button')

    expect(personalId).toBeTruthy()
    expect(address).toBeTruthy()
    if (!personalId || !address) return

    expect(personalId.getAttribute('aria-pressed')).toBe('false')
    expect(address.getAttribute('aria-pressed')).toBe('false')

    await user.click(personalId)
    expect(personalId.getAttribute('aria-pressed')).toBe('true')
    expect(address.getAttribute('aria-pressed')).toBe('false')

    await user.click(address)
    expect(personalId.getAttribute('aria-pressed')).toBe('false')
    expect(address.getAttribute('aria-pressed')).toBe('true')
  })

  it('Continue button is disabled when nothing is selected', () => {
    renderPage()

    const continueBtn = screen.getByRole('button', { name: /continue/i })
    expect(continueBtn).toBeTruthy()
    expect((continueBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it('Continue button becomes enabled after selecting a credential', async () => {
    const user = userEvent.setup()
    renderPage()

    const continueBtn = screen.getByRole('button', { name: /continue/i })
    expect((continueBtn as HTMLButtonElement).disabled).toBe(true)

    await user.click(screen.getByText('Personal ID').closest('button')!)
    expect((continueBtn as HTMLButtonElement).disabled).toBe(false)
  })

  it('shows issuer logo when provided by backend', () => {
    renderPage()

    const logos = screen.getAllByRole('img', { name: /Keycloak-demo logo/i })
    expect(logos.length).toBeGreaterThan(0)
    expect(logos[0]?.getAttribute('src')).toBe('https://issuer.example.org/logo.png')
  })

  it('shows safe fallback when issuer logo is missing', () => {
    mockOfferState.offer = baseOffer({
      issuer: {
        credential_issuer: 'https://issuer.example.org',
        display_name: null,
        logo_uri: null,
      },
      credential_types: [
        {
          credential_configuration_id: 'a',
          format: 'vc+sd-jwt',
          display: { name: 'Type A' },
        },
      ],
    })

    renderPage()
    expect(screen.getAllByText('https://issuer.example.org').length).toBeGreaterThan(0)
    expect(screen.queryAllByRole('img', { name: /logo/i }).length).toBe(0)
  })

  it('redirects to scan page when offer is unavailable', async () => {
    mockOfferState.offer = undefined

    renderPage()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(routes.scan, { replace: true })
    })
  })

  it('shows issuer display_name when provided', () => {
    renderPage()

    expect(screen.getAllByText('Keycloak-demo').length).toBeGreaterThan(0)
  })

  it('falls back to credential_issuer URL when display_name is null', () => {
    mockOfferState.offer = baseOffer({
      issuer: {
        credential_issuer: 'https://fallback.example.org',
        display_name: null,
        logo_uri: null,
      },
    })

    renderPage()
    expect(screen.getAllByText('https://fallback.example.org').length).toBeGreaterThan(0)
  })
})
