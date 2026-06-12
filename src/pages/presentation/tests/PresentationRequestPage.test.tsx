// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PresentationRequestPage } from '../PresentationRequestPage'
import { routes } from '../../../constants/routes'
import type { CredentialMatch } from '../../../types/presentation'

const credentialMatch: CredentialMatch = {
  query_id: 'pid_request',
  required: true,
  candidates: [
    {
      credential_id: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
      display: {
        name: 'Identity Credential',
        issuer_name: 'Keycloak-demo Solution Adorsys',
        credential_type: 'eu.europa.ec.eudi.pid.1',
        logo: null,
      },
      requested_claims: [],
    },
  ],
}

const mockNavigate = vi.fn()
const mockReset = vi.fn()
const mockSetSelectedCredentials = vi.fn()

let mockPresentationStatus = 'idle'
let mockCredentialMatches: CredentialMatch[] | undefined

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../../hooks/presentation/usePresentationSession', () => ({
  usePresentationSession: () => ({
    sessionState: { status: 'idle' },
    startRequest: vi.fn(),
    reset: mockReset,
  }),
}))

vi.mock('../../../components/Footer', () => ({
  Footer: () => <nav data-testid="footer">Footer</nav>,
}))

vi.mock('../../../state/presentation.state', () => ({
  usePresentationState: () => ({
    status: mockPresentationStatus,
    credential_matches: mockCredentialMatches,
    setSelectedCredentials: mockSetSelectedCredentials,
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
    <MemoryRouter initialEntries={[routes.present]}>
      <Routes>
        <Route path={routes.present} element={<PresentationRequestPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('PresentationRequestPage', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    mockNavigate.mockReset()
    mockReset.mockReset()
    mockSetSelectedCredentials.mockReset()
    mockPresentationStatus = 'idle'
    mockCredentialMatches = undefined
  })

  it('redirects to scan when opened without an active presentation session', () => {
    const { container } = renderPage()
    expect(container.firstChild).toBeNull()
    expect(mockNavigate).toHaveBeenCalledWith(routes.scan, { replace: true })
  })

  it('shows credential types returned by the backend', () => {
    mockPresentationStatus = 'selecting'
    mockCredentialMatches = [credentialMatch]

    renderPage()

    expect(screen.getByText('Select a Credential')).toBeTruthy()
    expect(screen.getByText('to present to')).toBeTruthy()
    expect(screen.getByText('Identity Credential')).toBeTruthy()
    expect(screen.getByText('Keycloak-demo Solution Adorsys')).toBeTruthy()
    expect(screen.getByTestId('footer')).toBeTruthy()
  })

  it('shows empty state when no credentials match the request', () => {
    mockPresentationStatus = 'selecting'
    mockCredentialMatches = []

    renderPage()

    expect(
      screen.getByText(/don't have a credential that meets this proof request/i)
    ).toBeTruthy()
  })

  it('resets and returns home when back is pressed', async () => {
    mockPresentationStatus = 'selecting'
    mockCredentialMatches = [credentialMatch]

    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(mockReset).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith(routes.home)
  })
})
