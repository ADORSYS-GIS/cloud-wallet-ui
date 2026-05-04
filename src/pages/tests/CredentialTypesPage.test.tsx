// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CredentialTypesPage } from '../CredentialTypesPage'
import { credentialTypeDetailsPath, routes } from '../../constants/routes'
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
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../state/issuance.state', () => ({
  useCredentialOfferState: () => mockOfferState,
}))

vi.mock('../../components/Footer', () => ({
  Footer: ({ onScanClick }: { onScanClick: () => void }) => (
    <button type="button" onClick={onScanClick}>
      Footer Scan
    </button>
  ),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <CredentialTypesPage />
    </MemoryRouter>
  )
}

describe('CredentialTypesPage', () => {
  afterEach(() => cleanup())

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

  it('navigates to credential type details when a type is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    const personalId = screen.getByText('Personal ID').closest('button')
    await user.click(personalId!)
    expect(mockNavigate).toHaveBeenCalledWith(credentialTypeDetailsPath('pid'))
  })

  it('shows issuer display_name when provided', () => {
    renderPage()
    expect(screen.getAllByText('Keycloak-demo').length).toBeGreaterThan(0)
  })

  it('falls back to hostname (not raw URL) when display_name is null', () => {
    mockOfferState.offer = baseOffer({
      issuer: {
        credential_issuer: 'https://fallback.example.org',
        display_name: null,
        logo_uri: null,
      },
    })
    renderPage()
    expect(screen.getAllByText('fallback.example.org').length).toBeGreaterThan(0)
    // Initials should be "FA" not "HT"
    const initials = screen.getAllByText('FA')
    expect(initials.length).toBeGreaterThan(0)
  })

  it('shows issuer logo when provided by backend', () => {
    renderPage()
    const logos = screen.getAllByRole('img', { name: /Keycloak-demo logo/i })
    expect(logos.length).toBeGreaterThan(0)
    expect(logos[0]?.getAttribute('src')).toBe('https://issuer.example.org/logo.png')
  })

  it('shows initials placeholder when logo_uri is null', () => {
    mockOfferState.offer = baseOffer({
      issuer: {
        credential_issuer: 'https://issuer.example.org',
        display_name: 'My Issuer',
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
    expect(screen.queryAllByRole('img', { name: /logo/i }).length).toBe(0)
    expect(screen.getAllByText('MY').length).toBeGreaterThan(0)
  })

  it('swaps logo to initials placeholder when logo URL is present but image fails to load', async () => {
    mockOfferState.offer = baseOffer({
      issuer: {
        credential_issuer: 'https://issuer.example.org',
        display_name: 'Keycloak-demo',
        logo_uri: 'https://issuer.example.org/broken.png',
      },
      credential_types: [
        {
          credential_configuration_id: 'pid',
          format: 'vc+sd-jwt',
          display: { name: 'Personal ID' },
        },
      ],
    })

    renderPage()

    // Trigger onError on every img with the broken src
    const imgs = screen.getAllByRole('img', { name: /Keycloak-demo logo/i })
    expect(imgs.length).toBeGreaterThan(0)
    imgs.forEach((img) => fireEvent.error(img))

    // After error, images should be gone and initials placeholder shown
    await waitFor(() => {
      expect(screen.queryAllByRole('img', { name: /Keycloak-demo logo/i }).length).toBe(0)
    })
    expect(screen.getAllByText('KE').length).toBeGreaterThan(0)
  })

  it('redirects to scan page when offer is unavailable', async () => {
    mockOfferState.offer = undefined
    renderPage()
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(routes.scan, { replace: true })
    })
  })

  it('redirects to scan with ?error=empty-options when credential_types is empty', async () => {
    mockOfferState.offer = baseOffer({ credential_types: [] })
    renderPage()
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`${routes.scan}?error=empty-options`, {
        replace: true,
      })
    })
  })

  it('navigates to scan from header back button', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(mockNavigate).toHaveBeenCalledWith(routes.scan)
  })

  it('navigates to scan when footer scan is clicked', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Footer Scan' }))
    expect(mockNavigate).toHaveBeenCalledWith(routes.scan)
  })
})
