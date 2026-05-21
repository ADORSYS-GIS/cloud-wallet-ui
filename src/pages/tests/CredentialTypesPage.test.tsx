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
  credentialIssuerUrl?: string
  setLoading: () => void
  setOffer: (offer: StartIssuanceResponse, credentialIssuerUrl?: string) => void
  setError: () => void
  clear: () => void
}

const mockOfferState: MockState = {
  status: 'success',
  offer: undefined,
  credentialIssuerUrl: undefined,
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
    credential_issuer: 'https://issuer.example.org',
    issuer: [
      {
        name: 'Keycloak-demo',
        locale: 'en-US',
        logo: {
          uri: 'https://issuer.example.org/logo.png',
          alt_text: 'Issuer logo',
        },
      },
    ],
    credential_types: [
      {
        credential_configuration_id: 'pid',
        format: 'dc+sd-jwt',
        display: [{ name: 'Personal ID' }],
      },
      {
        credential_configuration_id: 'address',
        format: 'dc+sd-jwt',
        display: [{ name: 'Address Credential' }],
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

  it('shows issuer hostname from credential_issuer URL when provided', () => {
    mockOfferState.credentialIssuerUrl = 'https://issuer.example.org'
    renderPage()
    // When credentialIssuerUrl is provided, hostname takes precedence over display name
    expect(screen.getAllByText('issuer.example.org').length).toBeGreaterThan(0)
  })

  it('falls back to hostname when display array is empty', () => {
    mockOfferState.offer = baseOffer({
      credential_issuer: 'https://fallback.example.org',
      issuer: [],
    })
    mockOfferState.credentialIssuerUrl = 'https://fallback.example.org'
    renderPage()
    expect(screen.getAllByText('fallback.example.org').length).toBeGreaterThan(0)
    // Initials should be "FA" not "HT"
    const initials = screen.getAllByText('FA')
    expect(initials.length).toBeGreaterThan(0)
  })

  it('shows issuer logo when provided by backend', () => {
    mockOfferState.credentialIssuerUrl = 'https://issuer.example.org'
    renderPage()
    // When credentialIssuerUrl is provided, the issuer name becomes the hostname
    const logos = screen.getAllByRole('img', { name: /issuer.example.org logo/i })
    expect(logos.length).toBeGreaterThan(0)
    expect(logos[0]?.getAttribute('src')).toBe('https://issuer.example.org/logo.png')
  })

  it('shows initials placeholder when display entry has no logo', () => {
    mockOfferState.offer = baseOffer({
      credential_issuer: 'https://issuer.example.org',
      issuer: [{ name: 'My Issuer', locale: 'en-US' }],
      credential_types: [
        {
          credential_configuration_id: 'a',
          format: 'dc+sd-jwt',
          display: [{ name: 'Type A' }],
        },
      ],
    })
    mockOfferState.credentialIssuerUrl = 'https://issuer.example.org'
    renderPage()
    expect(screen.queryAllByRole('img', { name: /logo/i }).length).toBe(0)
    // When credentialIssuerUrl is provided, hostname takes precedence -> "issuer.example.org" -> "IS"
    expect(screen.getAllByText('IS').length).toBeGreaterThan(0)
  })

  it('swaps logo to initials placeholder when logo URL is present but image fails to load', async () => {
    mockOfferState.offer = baseOffer({
      credential_issuer: 'https://issuer.example.org',
      issuer: [
        {
          name: 'Keycloak-demo',
          locale: 'en-US',
          logo: {
            uri: 'https://issuer.example.org/broken.png',
            alt_text: 'Issuer logo',
          },
        },
      ],
      credential_types: [
        {
          credential_configuration_id: 'pid',
          format: 'dc+sd-jwt',
          display: [{ name: 'Personal ID' }],
        },
      ],
    })
    mockOfferState.credentialIssuerUrl = 'https://issuer.example.org'

    renderPage()

    // Trigger onError on every img with the broken src
    // When credentialIssuerUrl is provided, the issuer name becomes the hostname
    const imgs = screen.getAllByRole('img', { name: /issuer.example.org logo/i })
    expect(imgs.length).toBeGreaterThan(0)
    imgs.forEach((img) => fireEvent.error(img))

    // After error, images should be gone and initials placeholder shown
    // Initials are based on hostname "issuer.example.org" -> "IS"
    await waitFor(() => {
      expect(
        screen.queryAllByRole('img', { name: /issuer.example.org logo/i }).length
      ).toBe(0)
    })
    expect(screen.getAllByText('IS').length).toBeGreaterThan(0)
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
