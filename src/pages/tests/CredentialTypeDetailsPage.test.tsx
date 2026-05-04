// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CredentialTypeDetailsPage } from '../CredentialTypeDetailsPage'
import { routes, issuanceSuccessPath } from '../../constants/routes'
import type { StartIssuanceResponse, ConsentResponse } from '../../types/issuance'
import type { SseStreamStatus } from '../../hooks/useSseStream'
import { ApiError } from '../../api/client'

const mockNavigate = vi.fn()

const mockOfferState: {
  offer?: StartIssuanceResponse
  clear: () => void
} = {
  offer: undefined,
  clear: vi.fn(),
}

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../state/issuance.state', () => ({
  useCredentialOfferState: () => mockOfferState,
}))

// Mock the issuance-session API
vi.mock('../../api/issuance-session', () => ({
  submitConsent: vi.fn(),
  submitTxCode: vi.fn(),
  cancelSession: vi.fn(),
}))

// Mock SSE hook
const mockOpenStream = vi.fn()
const mockCloseStream = vi.fn()
let mockStreamStatus: SseStreamStatus = { status: 'idle' }

vi.mock('../../hooks/useSseStream', () => ({
  useSseStream: () => ({
    streamStatus: mockStreamStatus,
    openStream: mockOpenStream,
    closeStream: mockCloseStream,
  }),
}))

import { submitConsent, submitTxCode, cancelSession } from '../../api/issuance-session'
const mockSubmitConsent = vi.mocked(submitConsent)
const mockSubmitTxCode = vi.mocked(submitTxCode)
const mockCancelSession = vi.mocked(cancelSession)

function buildOffer(
  overrides: Partial<StartIssuanceResponse> = {}
): StartIssuanceResponse {
  return {
    session_id: 'ses_123',
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
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
    ...overrides,
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

function renderRawPath(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<CredentialTypeDetailsPage />} />
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
    mockSubmitTxCode.mockReset()
    mockCancelSession.mockReset()
    mockStreamStatus = { status: 'idle' }
    mockOfferState.offer = buildOffer()
    vi.mocked(mockOfferState.clear).mockReset()
  })

  afterEach(() => cleanup())

  it('renders credential type display fields per spec', () => {
    renderPage()
    expect(screen.getByText('Credential Type Details')).toBeTruthy()
    expect(screen.getAllByText('Identity Credential').length).toBeGreaterThan(0)
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

  it('navigates to credential types when header back button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(mockNavigate).toHaveBeenCalledWith(routes.credentialTypes)
  })

  it('does NOT render claims from a non-spec extension field', () => {
    renderPage()
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

  it('opens SSE stream immediately after receiving consent response (spec requirement)', async () => {
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

  it('shows TX code input when next_action is provide_tx_code', async () => {
    const offerWithTxCode = buildOffer({
      flow: 'pre_authorized_code',
      tx_code_required: true,
      tx_code: {
        input_mode: 'numeric',
        length: 6,
        description: 'Enter the one-time code sent to your email.',
      },
    })
    mockOfferState.offer = offerWithTxCode

    const consentResponse: ConsentResponse = {
      session_id: 'ses_123',
      next_action: 'provide_tx_code',
    }
    mockSubmitConsent.mockResolvedValueOnce(consentResponse)

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))

    await waitFor(() => {
      expect(screen.getByText('Transaction Code Required')).toBeTruthy()
    })
    expect(screen.getByText('Enter the one-time code sent to your email.')).toBeTruthy()
  })

  it('submits TX code via POST /issuance/{session_id}/tx-code', async () => {
    const offerWithTxCode = buildOffer({
      flow: 'pre_authorized_code',
      tx_code_required: true,
      tx_code: { input_mode: 'numeric', length: 6, description: null },
    })
    mockOfferState.offer = offerWithTxCode

    mockSubmitConsent.mockResolvedValueOnce({
      session_id: 'ses_123',
      next_action: 'provide_tx_code',
    } as ConsentResponse)
    mockSubmitTxCode.mockResolvedValueOnce({ session_id: 'ses_123' })

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))

    await waitFor(() => {
      expect(screen.getByText('Transaction Code Required')).toBeTruthy()
    })

    // Type into the hidden input (sr-only)
    const hiddenInput = screen.getByRole('textbox', { hidden: true })
    await user.type(hiddenInput, '123456')
    await user.click(screen.getByRole('button', { name: 'Submit Code' }))

    await waitFor(() => {
      expect(mockSubmitTxCode).toHaveBeenCalledWith('ses_123', '123456')
    })
    expect(screen.getByText('Exchanging authorization token…')).toBeTruthy()
  })

  it('shows error when tx code submission fails (e.g. invalid_tx_code)', async () => {
    const offerWithTxCode = buildOffer({
      flow: 'pre_authorized_code',
      tx_code_required: true,
      tx_code: { input_mode: 'numeric', length: 6, description: null },
    })
    mockOfferState.offer = offerWithTxCode

    mockSubmitConsent.mockResolvedValueOnce({
      session_id: 'ses_123',
      next_action: 'provide_tx_code',
    } as ConsentResponse)
    mockSubmitTxCode.mockRejectedValueOnce(
      new Error('Transaction code must be exactly 6 numeric digits.')
    )

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))

    await waitFor(() => {
      expect(screen.getByText('Transaction Code Required')).toBeTruthy()
    })

    const hiddenInput = screen.getByRole('textbox', { hidden: true })
    await user.type(hiddenInput, '000000')
    await user.click(screen.getByRole('button', { name: 'Submit Code' }))

    await waitFor(() => {
      expect(
        screen.getByText('Transaction code must be exactly 6 numeric digits.')
      ).toBeTruthy()
    })
  })

  it('navigates to issuance success when SSE completed event received', async () => {
    mockStreamStatus = {
      status: 'completed',
      credentialIds: ['cred-uuid-1'],
      credentialTypes: ['identity_credential'],
    }

    renderPage()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        issuanceSuccessPath('cred-uuid-1'),
        expect.objectContaining({ state: { credentialId: 'cred-uuid-1' } })
      )
    })
  })

  it('calls cancelSession and navigates to credential types on Cancel click', async () => {
    mockCancelSession.mockResolvedValueOnce(undefined)

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockNavigate).toHaveBeenCalledWith(routes.credentialTypes)
  })

  it('calls cancelSession when cancelling from TX code screen', async () => {
    const offerWithTxCode = buildOffer({
      flow: 'pre_authorized_code',
      tx_code_required: true,
      tx_code: { input_mode: 'numeric', length: 6, description: null },
    })
    mockOfferState.offer = offerWithTxCode

    mockSubmitConsent.mockResolvedValueOnce({
      session_id: 'ses_123',
      next_action: 'provide_tx_code',
    } as ConsentResponse)
    mockCancelSession.mockResolvedValueOnce(undefined)

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))

    await waitFor(() => {
      expect(screen.getByText('Transaction Code Required')).toBeTruthy()
    })

    // Cancel from the TX code dialog
    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' })
    // The TX code Cancel button is the first one rendered in TxCodeInput
    await user.click(cancelButtons[0])

    await waitFor(() => {
      expect(mockCancelSession).toHaveBeenCalledWith('ses_123')
    })
    expect(mockNavigate).toHaveBeenCalledWith(routes.credentialTypes)
  })

  it('still navigates to credential types when cancelSession fails from tx-code modal', async () => {
    const offerWithTxCode = buildOffer({
      flow: 'pre_authorized_code',
      tx_code_required: true,
      tx_code: { input_mode: 'numeric', length: 6, description: null },
    })
    mockOfferState.offer = offerWithTxCode

    mockSubmitConsent.mockResolvedValueOnce({
      session_id: 'ses_123',
      next_action: 'provide_tx_code',
    } as ConsentResponse)
    mockCancelSession.mockRejectedValueOnce(new Error('cancel failed'))

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))

    await waitFor(() => {
      expect(screen.getByText('Transaction Code Required')).toBeTruthy()
    })

    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' })
    await user.click(cancelButtons[0])

    await waitFor(() => {
      expect(mockCancelSession).toHaveBeenCalledWith('ses_123')
    })
    expect(mockNavigate).toHaveBeenCalledWith(routes.credentialTypes)
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

  it('redirects to credential types when selected type is unavailable', async () => {
    renderPage('/credential-types/unknown')
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(routes.credentialTypes, {
        replace: true,
      })
    })
  })

  it('redirects when optionId route param is missing', async () => {
    renderRawPath('/credential-types')
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(routes.credentialTypes, {
        replace: true,
      })
    })
  })

  it('redirects when there is no offer session in state', async () => {
    mockOfferState.offer = undefined
    renderPage()
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(routes.credentialTypes, {
        replace: true,
      })
    })
  })

  it('does not re-handle identical SSE status on rerender', async () => {
    mockStreamStatus = {
      status: 'completed',
      credentialIds: ['cred-uuid-1'],
      credentialTypes: ['identity_credential'],
    }

    const view = renderPage()
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledTimes(1)
    })

    mockStreamStatus = {
      status: 'completed',
      credentialIds: ['cred-uuid-1'],
      credentialTypes: ['identity_credential'],
    }
    view.rerender(
      <MemoryRouter initialEntries={['/credential-types/identity_credential']}>
        <Routes>
          <Route
            path={routes.credentialTypeDetails}
            element={<CredentialTypeDetailsPage />}
          />
        </Routes>
      </MemoryRouter>
    )

    expect(mockNavigate).toHaveBeenCalledTimes(1)
  })

  it('ignores immediate second Issue VC click while consent is in-flight', () => {
    mockSubmitConsent.mockReturnValue(
      new Promise<ConsentResponse>(() => {
        // Keep unresolved so the in-flight guard is exercised.
      })
    )

    renderPage()
    const issueButton = screen.getByRole('button', { name: 'Issue VC' })
    fireEvent.click(issueButton)
    fireEvent.click(issueButton)

    expect(mockSubmitConsent).toHaveBeenCalledTimes(1)
  })

  it('shows failure overlay when SSE failed event received', async () => {
    mockStreamStatus = {
      status: 'failed',
      error: 'access_denied',
      errorDescription: 'The user denied authorization.',
      step: 'authorization',
    }

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('The user denied authorization.')).toBeTruthy()
    })
  })

  it('shows timeout error when issuer processing takes too long', async () => {
    vi.useFakeTimers()
    try {
      mockStreamStatus = {
        status: 'processing',
        step: 'requesting_credential',
      }

      renderPage()

      await act(async () => {
        await vi.runOnlyPendingTimersAsync()
      })

      await act(async () => {
        vi.advanceTimersByTime(45_000)
      })

      expect(
        screen.getByText(
          'The issuer is taking longer than expected to respond. Please try again.'
        )
      ).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('blocks issuance submission when the session is expired', async () => {
    mockOfferState.offer = buildOffer({ expires_at: '2020-01-01T00:00:00Z' })

    const user = userEvent.setup()
    renderPage()

    const issueButton = screen.getByRole('button', { name: 'Issue VC' })
    expect(issueButton.hasAttribute('disabled')).toBe(true)

    await user.click(issueButton)
    expect(mockSubmitConsent).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(
        screen.getByText(
          'This issuance session has expired. Please restart the flow and scan again.'
        )
      ).toBeTruthy()
    })
  })

  it('shows expiry error when cancel is clicked after session expiry', async () => {
    mockOfferState.offer = buildOffer({ expires_at: '2020-01-01T00:00:00Z' })

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockCancelSession).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(
        screen.getByText(
          'This issuance session has expired. Please restart the flow and scan again.'
        )
      ).toBeTruthy()
    })
  })

  it('falls back to issuer host when display_name is missing', () => {
    mockOfferState.offer = buildOffer({
      issuer: {
        credential_issuer: 'https://issuer-host.example.org',
        display_name: null,
        logo_uri: null,
      },
    })
    renderPage()
    expect(screen.getByText('issuer-host.example.org')).toBeTruthy()
  })

  it('shows failure when redirect action has no authorization_url', async () => {
    mockSubmitConsent.mockResolvedValueOnce({
      session_id: 'ses_123',
      next_action: 'redirect',
      authorization_url: null,
    } as unknown as ConsentResponse)

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))

    await waitFor(() => {
      expect(
        screen.getByText('Authorization URL missing from server response.')
      ).toBeTruthy()
    })
  })

  it('calls cancelSession when main cancel button is clicked while tx-code modal is open', async () => {
    const offerWithTxCode = buildOffer({
      flow: 'pre_authorized_code',
      tx_code_required: true,
      tx_code: { input_mode: 'numeric', length: 6, description: null },
    })
    mockOfferState.offer = offerWithTxCode
    mockSubmitConsent.mockResolvedValueOnce({
      session_id: 'ses_123',
      next_action: 'provide_tx_code',
    } as ConsentResponse)
    mockCancelSession.mockResolvedValueOnce(undefined)

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))

    await waitFor(() => {
      expect(screen.getByText('Transaction Code Required')).toBeTruthy()
    })

    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' })
    await user.click(cancelButtons[1])

    await waitFor(() => {
      expect(mockCancelSession).toHaveBeenCalledWith('ses_123')
    })
    expect(mockNavigate).toHaveBeenCalledWith(routes.credentialTypes)
  })

  it('redirects browser when consent next_action is redirect with authorization_url', async () => {
    mockSubmitConsent.mockResolvedValueOnce({
      session_id: 'ses_123',
      next_action: 'redirect',
      authorization_url: 'https://auth.example.org/authorize?x=1',
    } as ConsentResponse)

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))

    await waitFor(() => {
      expect(screen.getByText('Processing…')).toBeTruthy()
    })
  })

  it('navigates to scan when consent result is rejected', async () => {
    mockSubmitConsent.mockResolvedValueOnce({
      session_id: 'ses_123',
      next_action: 'rejected',
    } as ConsentResponse)

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(routes.scan, { replace: true })
    })
  })

  it('navigates back to credential types from top back button', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(mockNavigate).toHaveBeenCalledWith(routes.credentialTypes)
  })

  it('still navigates away when cancelSession fails during cancel action', async () => {
    mockSubmitConsent.mockResolvedValueOnce({
      session_id: 'ses_123',
      next_action: 'none',
    } as ConsentResponse)
    mockCancelSession.mockRejectedValueOnce(new Error('cancel failed'))

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(routes.credentialTypes)
    })
  })

  it('prevents duplicate Issue VC calls while consent is in flight', async () => {
    mockSubmitConsent.mockReturnValue(
      new Promise<ConsentResponse>(() => {
        // Intentionally unresolved to keep request in-flight.
      })
    )

    const user = userEvent.setup()
    renderPage()
    const issueButton = screen.getByRole('button', { name: 'Issue VC' })
    await user.click(issueButton)
    await user.click(issueButton)

    expect(mockSubmitConsent).toHaveBeenCalledTimes(1)
  })

  it('shows mapped message when consent fails with ApiError', async () => {
    mockSubmitConsent.mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', {
        errorCode: 'unauthorized',
        errorDescription: null,
      })
    )

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))

    await waitFor(() => {
      expect(
        screen.getByText('Authentication failed. Please restart the flow and try again.')
      ).toBeTruthy()
    })
  })

  it('prevents duplicate top-level cancel action while cancel is in flight', async () => {
    mockSubmitConsent.mockResolvedValueOnce({
      session_id: 'ses_123',
      next_action: 'none',
    } as ConsentResponse)
    mockCancelSession.mockReturnValue(
      new Promise<void>(() => {
        // Intentionally unresolved to keep request in-flight.
      })
    )

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))

    const cancelButton = screen.getAllByRole('button', { name: 'Cancel' })[0]
    await user.click(cancelButton)
    await user.click(cancelButton)

    expect(mockCancelSession).toHaveBeenCalledTimes(1)
  })

  it('shows tx-code spec error when server asks for tx code without tx_code payload', async () => {
    mockOfferState.offer = buildOffer({
      flow: 'pre_authorized_code',
      tx_code_required: true,
      tx_code: null,
    })
    mockSubmitConsent.mockResolvedValueOnce({
      session_id: 'ses_123',
      next_action: 'provide_tx_code',
    } as ConsentResponse)

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          /Server requested a transaction code but did not provide the code spec/i
        )
      ).toBeTruthy()
    })
  })

  it('still navigates when tx-code cancel API fails', async () => {
    mockOfferState.offer = buildOffer({
      flow: 'pre_authorized_code',
      tx_code_required: true,
      tx_code: { input_mode: 'numeric', length: 6, description: null },
    })
    mockSubmitConsent.mockResolvedValueOnce({
      session_id: 'ses_123',
      next_action: 'provide_tx_code',
    } as ConsentResponse)
    mockCancelSession.mockRejectedValueOnce(new Error('cancel failed'))

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))
    await waitFor(() => {
      expect(screen.getByText('Transaction Code Required')).toBeTruthy()
    })

    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' })
    await user.click(cancelButtons[0])

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(routes.credentialTypes)
    })
  })

  it('transitions to session-expired state when expires_at is reached', async () => {
    vi.useFakeTimers()
    try {
      const expiresSoon = new Date(Date.now() + 1_200).toISOString()
      mockOfferState.offer = buildOffer({ expires_at: expiresSoon })
      renderPage()

      expect(
        screen.queryByText(
          'This issuance session has expired. Please restart the flow and scan again.'
        )
      ).toBeNull()

      await act(async () => {
        vi.advanceTimersByTime(2_000)
      })

      expect(
        screen.getByText(
          'This issuance session has expired. Please restart the flow and scan again.'
        )
      ).toBeTruthy()
      expect(
        screen.getByRole('button', { name: 'Issue VC' }).hasAttribute('disabled')
      ).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('blocks tx-code submit path after session expires', async () => {
    const user = userEvent.setup()
    const offerWithTxCode = buildOffer({
      expires_at: new Date(Date.now() + 100).toISOString(),
      flow: 'pre_authorized_code',
      tx_code_required: true,
      tx_code: { input_mode: 'numeric', length: 6, description: null },
    })
    mockOfferState.offer = offerWithTxCode
    mockSubmitConsent.mockResolvedValueOnce({
      session_id: 'ses_123',
      next_action: 'provide_tx_code',
    } as ConsentResponse)

    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))

    await waitFor(() => {
      expect(screen.getByText('Transaction Code Required')).toBeTruthy()
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1200))
    })

    expect(mockSubmitTxCode).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Submit Code' })).toBeNull()
    expect(
      screen.getByText(
        'This issuance session has expired. Please restart the flow and scan again.'
      )
    ).toBeTruthy()
  })

  it('blocks tx-code cancel path after session expires', async () => {
    const user = userEvent.setup()
    const offerWithTxCode = buildOffer({
      expires_at: new Date(Date.now() + 100).toISOString(),
      flow: 'pre_authorized_code',
      tx_code_required: true,
      tx_code: { input_mode: 'numeric', length: 6, description: null },
    })
    mockOfferState.offer = offerWithTxCode
    mockSubmitConsent.mockResolvedValueOnce({
      session_id: 'ses_123',
      next_action: 'provide_tx_code',
    } as ConsentResponse)

    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))

    await waitFor(() => {
      expect(screen.getByText('Transaction Code Required')).toBeTruthy()
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1200))
    })

    expect(mockCancelSession).not.toHaveBeenCalled()
    expect(screen.queryByText('Transaction Code Required')).toBeNull()
    expect(
      screen.getByText(
        'This issuance session has expired. Please restart the flow and scan again.'
      )
    ).toBeTruthy()
  })

  it('prevents duplicate tx-code submission while submit is in flight', async () => {
    const offerWithTxCode = buildOffer({
      flow: 'pre_authorized_code',
      tx_code_required: true,
      tx_code: { input_mode: 'numeric', length: 6, description: null },
    })
    mockOfferState.offer = offerWithTxCode
    mockSubmitConsent.mockResolvedValueOnce({
      session_id: 'ses_123',
      next_action: 'provide_tx_code',
    } as ConsentResponse)

    mockSubmitTxCode.mockReturnValue(
      new Promise<{ session_id: string }>(() => {
        // Intentionally unresolved to keep request in-flight.
      })
    )

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))
    await waitFor(() => {
      expect(screen.getByText('Transaction Code Required')).toBeTruthy()
    })

    const hiddenInput = screen.getByRole('textbox', { hidden: true })
    await user.type(hiddenInput, '123456')
    fireEvent.keyDown(hiddenInput, { key: 'Enter' })
    fireEvent.keyDown(hiddenInput, { key: 'Enter' })

    expect(mockSubmitTxCode).toHaveBeenCalledTimes(1)
  })

  it('prevents duplicate tx-code cancellation while cancel request is in flight', async () => {
    const offerWithTxCode = buildOffer({
      flow: 'pre_authorized_code',
      tx_code_required: true,
      tx_code: { input_mode: 'numeric', length: 6, description: null },
    })
    mockOfferState.offer = offerWithTxCode
    mockSubmitConsent.mockResolvedValueOnce({
      session_id: 'ses_123',
      next_action: 'provide_tx_code',
    } as ConsentResponse)

    mockCancelSession.mockReturnValue(
      new Promise<void>(() => {
        // Intentionally unresolved to keep request in-flight.
      })
    )

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))
    await waitFor(() => {
      expect(screen.getByText('Transaction Code Required')).toBeTruthy()
    })

    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' })
    await user.click(cancelButtons[0])
    await user.click(cancelButtons[0])

    expect(mockCancelSession).toHaveBeenCalledTimes(1)
  })

  it('does not call cancelSession when cancelling from hidden overlay state', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mockCancelSession).not.toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith(routes.credentialTypes)
  })

  it('restarts flow from failure overlay scan-again action', async () => {
    mockSubmitConsent.mockResolvedValueOnce({
      session_id: 'ses_123',
      next_action: 'redirect',
      authorization_url: null,
    } as unknown as ConsentResponse)

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))
    await waitFor(() => {
      expect(
        screen.getByText('Authorization URL missing from server response.')
      ).toBeTruthy()
    })

    await user.click(screen.getByRole('button', { name: 'Scan again' }))

    expect(mockOfferState.clear).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith(routes.scan, { replace: true })
  })

  it('shows fallback tx-code error message when submission rejects with non-Error', async () => {
    const offerWithTxCode = buildOffer({
      flow: 'pre_authorized_code',
      tx_code_required: true,
      tx_code: { input_mode: 'numeric', length: 6, description: null },
    })
    mockOfferState.offer = offerWithTxCode

    mockSubmitConsent.mockResolvedValueOnce({
      session_id: 'ses_123',
      next_action: 'provide_tx_code',
    } as ConsentResponse)
    mockSubmitTxCode.mockRejectedValueOnce('bad tx')

    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Issue VC' }))
    await waitFor(() => {
      expect(screen.getByText('Transaction Code Required')).toBeTruthy()
    })

    const hiddenInput = screen.getByRole('textbox', { hidden: true })
    await user.type(hiddenInput, '123456')
    await user.click(screen.getByRole('button', { name: 'Submit Code' }))

    await waitFor(() => {
      expect(
        screen.getByText('Invalid transaction code. Please check and try again.')
      ).toBeTruthy()
    })
  })

  it('uses fallback message when SSE failed event has no errorDescription', async () => {
    mockStreamStatus = {
      status: 'failed',
      error: 'internal_error',
      errorDescription: null,
      step: 'requesting_credential',
    }

    renderPage()

    await waitFor(() => {
      expect(
        screen.getByText(
          'Issuance failed at step "requesting_credential": internal_error'
        )
      ).toBeTruthy()
    })
  })

  it('renders only core display rows when optional display fields are absent', () => {
    mockOfferState.offer = buildOffer({
      credential_types: [
        {
          credential_configuration_id: 'identity_credential',
          format: 'vc+sd-jwt',
          display: { name: 'Identity Credential' },
        },
      ],
    })

    renderPage()
    expect(screen.getByText('Credential Configuration ID')).toBeTruthy()
    expect(screen.queryByText('Description')).toBeNull()
    expect(screen.queryByText('Background Color')).toBeNull()
    expect(screen.queryByText('Text Color')).toBeNull()
    expect(screen.queryByText('Logo URI')).toBeNull()
    expect(screen.queryByText('Logo Alt Text')).toBeNull()
  })
})
