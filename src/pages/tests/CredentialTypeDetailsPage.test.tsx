// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CredentialTypeDetailsPage } from '../CredentialTypeDetailsPage'
import { routes } from '../../constants/routes'
import type { StartIssuanceResponse } from '../../types/issuance'

const mockNavigate = vi.fn()

const mockOfferState: {
  offer?: StartIssuanceResponse
} = {
  offer: undefined,
}

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../state/issuance.state', () => ({
  useCredentialOfferState: () => mockOfferState,
}))

function buildOffer(): StartIssuanceResponse {
  return {
    session_id: 'ses_123',
    expires_at: '2026-04-08T14:35:00Z',
    issuer: {
      credential_issuer: 'https://issuer.example.org',
      display_name: 'Issuer',
      logo_uri: null,
    },
    credential_types: [
      {
        credential_configuration_id: 'identity_credential',
        format: 'vc+sd-jwt',
        display: {
          name: 'Identity Credential',
          description: 'Official identity document',
          background_color: '#12107c',
          text_color: '#ffffff',
          logo: {
            uri: 'https://issuer.example.org/logo.svg',
            alt_text: 'Issuer logo',
          },
        },
      },
    ],
    flow: 'authorization_code',
    tx_code_required: false,
    tx_code: null,
  }
}

function renderPage(initialPath = '/credential-types/identity_credential') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path={routes.credentialTypeDetails}
          element={<CredentialTypeDetailsPage />}
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('CredentialTypeDetailsPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockOfferState.offer = buildOffer()
  })

  afterEach(() => cleanup())

  it('renders selected credential type details and claim rows', () => {
    renderPage()
    expect(screen.getByText('Credential Type Details')).toBeTruthy()
    expect(screen.getAllByText('Identity Credential').length).toBeGreaterThan(0)
    expect(screen.getByText('Credential Configuration Id')).toBeTruthy()
    expect(screen.getByText('Format')).toBeTruthy()
    expect(screen.getByText('Name')).toBeTruthy()
    expect(screen.getByText('Background Color')).toBeTruthy()
    expect(screen.getByText('Text Color')).toBeTruthy()
    expect(screen.getByText('Logo Uri')).toBeTruthy()
    expect(screen.getByText('Logo Alt Text')).toBeTruthy()
    expect(screen.getByText('Issue VC')).toBeTruthy()
    expect(screen.getByText('Cancel')).toBeTruthy()
  })

  it('renders dynamic credential claims when backend includes them', () => {
    const offer = buildOffer() as StartIssuanceResponse & {
      credential_types: Array<
        StartIssuanceResponse['credential_types'][number] & {
          claims?: Record<string, unknown>
        }
      >
    }
    offer.credential_types[0].claims = {
      given_name: 'Jane',
      family_name: 'Doe',
      birthdate: '1990-01-01',
    }
    mockOfferState.offer = offer

    renderPage()

    expect(screen.getByText('Given Name')).toBeTruthy()
    expect(screen.getByText('Family Name')).toBeTruthy()
    expect(screen.getByText('Birthdate')).toBeTruthy()
  })

  it('navigates to issuance success when Issue VC is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Issue VC' }))
    expect(mockNavigate).toHaveBeenCalledWith(routes.issuanceSuccess)
  })

  it('navigates back to credential types on Cancel', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mockNavigate).toHaveBeenCalledWith(routes.credentialTypes)
  })

  it('redirects to credential types when selected type is unavailable', async () => {
    renderPage('/credential-types/unknown')
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(routes.credentialTypes, {
        replace: true,
      })
    })
  })
})
