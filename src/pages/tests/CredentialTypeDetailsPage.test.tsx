// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CredentialTypeDetailsPage } from '../CredentialTypeDetailsPage'
import { routes, issuanceSuccessPath } from '../../constants/routes'
import type { StartIssuanceResponse, ConsentResponse } from '../../types/issuance'

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

// Mock the consent API
vi.mock('../../api/issuance-session', () => ({
  submitConsent: vi.fn(),
  cancelSession: vi.fn(),
}))

// Mock SSE hook
const mockOpenStream = vi.fn()
const mockCloseStream = vi.fn()
let mockStreamStatus = { status: 'idle' as const }

vi.mock('../../hooks/useSseStream', () => ({
  useSseStream: () => ({
    streamStatus: mockStreamStatus,
    openStream: mockOpenStream,
    closeStream: mockCloseStream,
  }),
}))

import { submitConsent } from '../../api/issuance-session'
const mockSubmitConsent = vi.mocked(submitConsent)

function buildOffer(): StartIssuanceResponse {
  return {
    session_id: 'ses_123',
    expires_at: '2026-04-08T14:35:00Z',
    issuer: {
      credential_issuer: 'https://issuer.example.org',
      display_name: 'Example Issuer',
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
    mockOpenStream.mockReset()
    mockCloseStream.mockReset()
    mockSubmitConsent.mockReset()
    mockStreamStatus = { status: 'idle' }
    mockOfferState.offer = buildOffer()
  })

  afterEach(() => cleanup())

  it('renders credential type display fields per spec', () => {
    renderPage()
    expect(screen.getByText('Credential Type Details')).toBeTruthy()
    // Header card
    expect(screen.getAllByText('Identity Credential').length).toBeGreaterThan(0)
    // Display rows — all fields from CredentialTypeDisplay.display
    expect(screen.getByText('Credential Configuration ID')).toBeTruthy()
    expect(screen.getByText('Format')).toBeTruthy()
    expect(screen.getByText('Name')).toBeTruthy()
    expect(screen.getByText('Description')).toBeTruthy()
    expect(screen.getByText('Background Color')).toBeTruthy()
    expect(screen.getByText('Text Color')).toBeTruthy()
    expect(screen.getByText('Logo URI')).toBeTruthy()
    expect(screen.getByText('Logo Alt Text')).toBeTruthy()
  })

  it('renders Issue VC and Cancel buttons', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Issue VC' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
  })

  it('does NOT render claims from a non-spec extension field', () => {
    // CredentialTypeDisplay has no claims; we must not try to render them
    renderPage()
    // "Given Name", "Family Name" etc. should NOT appear since spec has no claims here
    expect(screen.queryByText('Given Name')).toBeNull()
    expect(screen.queryByText('Family Name')).toBeNull()
  })

  it('calls POST /issuance/{session_id}/consent with selected type on Issue VC click', async () => {
    const consentResponse: ConsentResponse = {
      session_id: 'ses_123',
      next_action: 'none',
    }
    mockSubmitConsent.mockResolvedValueOnce(consentResponse)

    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Issue VC' }))

    expect(mockSubmitConsent).toHaveBeenCalledWith('ses_123', true, [
      'identity_credential',
    ])
  })

  it('opens SSE stream after consent is submitted', async () => {
    const consentResponse: ConsentResponse = {
      session_id: 'ses_123',
      next_action: 'none',
    }
    mockSubmitConsent.mockResolvedValueOnce(consentResponse)

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))

    expect(mockOpenStream).toHaveBeenCalledWith('ses_123')
  })

  it('navigates to credentials on Cancel', async () => {
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

  it('shows error overlay when consent API call fails', async () => {
    mockSubmitConsent.mockRejectedValueOnce(new Error('Network error'))

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeTruthy()
    })
  })

  it('navigates to issuance success when SSE completed event received', async () => {
    const consentResponse: ConsentResponse = {
      session_id: 'ses_123',
      next_action: 'none',
    }
    mockSubmitConsent.mockResolvedValueOnce(consentResponse)

    // Simulate SSE completed by returning completed status from hook
    mockStreamStatus = {
      status: 'completed' as const,
      credentialIds: ['cred-uuid-1'],
      credentialTypes: ['identity_credential'],
    } as Parameters<typeof mockNavigate>[0]

    vi.mock('../../hooks/useSseStream', () => ({
      useSseStream: () => ({
        streamStatus: mockStreamStatus,
        openStream: mockOpenStream,
        closeStream: mockCloseStream,
      }),
    }))

    renderPage()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        issuanceSuccessPath('cred-uuid-1'),
        expect.objectContaining({ state: { credentialId: 'cred-uuid-1' } })
      )
    })
  })
})
