// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PresentationProofDetailsPage } from '../PresentationProofDetailsPage'
import { routes } from '../../../constants/routes'
import type { CredentialMatch, VerifierDisplay } from '../../../types/presentation'

const verifier: VerifierDisplay = {
  name: 'Verifier App',
  verified: true,
}

const credentialMatch: CredentialMatch = {
  query_id: 'pid_request',
  required: true,
  candidates: [
    {
      credential_id: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
      display: {
        name: 'Identity Credential',
        issuer_name: 'Example Issuer',
        credential_type: 'eu.europa.ec.eudi.pid.1',
      },
      requested_claims: [{ path: ['given_name'], display_name: 'Given Name' }],
    },
  ],
}

const mockNavigate = vi.fn()
const mockSetStatus = vi.fn()
const mockSubmitConsent = vi.fn()

let mockPresentationStatus = 'idle'
let mockSessionId: string | undefined = 'prs_test'
let mockSelectedCredentials: { query_id: string; credential_id: string }[] | undefined = [
  {
    query_id: 'pid_request',
    credential_id: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
  },
]
let mockTransactionData: unknown[] | null | undefined = null
let mockIsSubmitting = false
let mockIsSharing = false

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../../hooks/presentation/usePresentationSubmission', () => ({
  usePresentationSubmission: () => ({
    isSubmitting: mockIsSubmitting,
    isSharing: mockIsSharing,
    submitConsent: mockSubmitConsent,
  }),
}))

vi.mock('../../../state/presentation.state', () => ({
  usePresentationState: () => ({
    status: mockPresentationStatus,
    session_id: mockSessionId,
    verifier,
    credential_matches: [credentialMatch],
    selected_credentials: mockSelectedCredentials,
    transaction_data: mockTransactionData,
    setStatus: mockSetStatus,
  }),
}))

vi.mock('../../../components/presentation/PresentationPageShell', () => ({
  PresentationPageShell: ({
    title,
    onBack,
    children,
  }: {
    title: string
    onBack: () => void
    children: React.ReactNode
  }) => (
    <div>
      <h1>{title}</h1>
      <button type="button" onClick={onBack}>
        Back
      </button>
      {children}
    </div>
  ),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[routes.presentationProofDetails]}>
      <Routes>
        <Route
          path={routes.presentationProofDetails}
          element={<PresentationProofDetailsPage />}
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('PresentationProofDetailsPage', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    mockNavigate.mockReset()
    mockSetStatus.mockReset()
    mockSubmitConsent.mockReset()
    mockPresentationStatus = 'idle'
    mockSessionId = 'prs_test'
    mockSelectedCredentials = [
      {
        query_id: 'pid_request',
        credential_id: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
      },
    ]
    mockTransactionData = null
    mockIsSubmitting = false
    mockIsSharing = false
  })

  it('does not redirect to scan when idle (e.g. after decline clears state)', () => {
    mockPresentationStatus = 'idle'
    const { container } = renderPage()
    expect(container.firstChild).toBeNull()
    expect(mockNavigate).not.toHaveBeenCalledWith(routes.scan, { replace: true })
  })

  it('redirects to scan when opened without reviewing status', () => {
    mockPresentationStatus = 'selecting'
    const { container } = renderPage()
    expect(container.firstChild).toBeNull()
    expect(mockNavigate).toHaveBeenCalledWith(routes.scan, { replace: true })
  })

  it('shows wallet loading overlay only while sharing', () => {
    mockPresentationStatus = 'submitting'
    mockIsSubmitting = true
    mockIsSharing = true

    renderPage()

    expect(mockNavigate).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.getByText('Sharing…')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Share' })).toHaveProperty('disabled', true)
  })

  it('does not show wallet loading overlay or disable Decline while declining', () => {
    mockPresentationStatus = 'reviewing'
    mockIsSubmitting = false
    mockIsSharing = false

    renderPage()

    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByText('Sharing…')).toBeNull()
    expect(screen.getByRole('button', { name: 'Decline' })).toHaveProperty(
      'disabled',
      false
    )
  })

  it('does not redirect to scan when submission reaches a terminal outcome', () => {
    mockPresentationStatus = 'success'

    renderPage()

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('does not redirect to scan when presentation state is cleared on decline', () => {
    mockPresentationStatus = 'idle'

    renderPage()

    expect(mockNavigate).not.toHaveBeenCalledWith(routes.scan, { replace: true })
  })

  it('submits accepted consent with selected credentials on Share', async () => {
    mockPresentationStatus = 'reviewing'
    const user = userEvent.setup()

    renderPage()
    await user.click(screen.getByRole('button', { name: 'Share' }))

    expect(mockSubmitConsent).toHaveBeenCalledWith({
      sessionId: 'prs_test',
      accepted: true,
      selectedCredentials: [
        {
          query_id: 'pid_request',
          credential_id: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
        },
      ],
      transactionDataAcknowledged: undefined,
    })
  })

  it('disables Share when transaction data is present but not acknowledged', async () => {
    mockPresentationStatus = 'reviewing'
    mockTransactionData = [{ type: 'payment', credential_ids: [], display_data: {} }]
    const user = userEvent.setup()

    renderPage()

    const shareButton = screen.getByRole('button', { name: 'Share' })
    expect(shareButton).toHaveProperty('disabled', true)

    // Acknowledge the transaction data
    await user.click(screen.getByRole('checkbox'))

    expect(shareButton).toHaveProperty('disabled', false)

    await user.click(shareButton)

    expect(mockSubmitConsent).toHaveBeenCalledWith({
      sessionId: 'prs_test',
      accepted: true,
      selectedCredentials: [
        {
          query_id: 'pid_request',
          credential_id: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
        },
      ],
      transactionDataAcknowledged: true,
    })
  })

  it('submits declined consent on Decline', async () => {
    mockPresentationStatus = 'reviewing'
    const user = userEvent.setup()

    renderPage()
    await user.click(screen.getByRole('button', { name: 'Decline' }))

    expect(mockSubmitConsent).toHaveBeenCalledWith({
      sessionId: 'prs_test',
      accepted: false,
    })
  })

  it('returns to credential selection on back when not submitting', async () => {
    mockPresentationStatus = 'reviewing'
    const user = userEvent.setup()

    renderPage()
    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(mockSetStatus).toHaveBeenCalledWith('selecting')
    expect(mockNavigate).toHaveBeenCalledWith(routes.present)
  })
})
