// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import { deleteCredential } from '../../api/credentials'
import { routes } from '../../constants/routes'
import { RemoveCredentialPage } from '../RemoveCredentialPage'

vi.mock('../../api/credentials', () => ({
  deleteCredential: vi.fn(),
}))

const mockedDeleteCredential = vi.mocked(deleteCredential)

describe('RemoveCredentialPage', () => {
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

  function renderPage(initialEntry = '/credentials/cred-1/remove') {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path={`${routes.credentials}/:credentialId/remove`}
            element={<RemoveCredentialPage />}
          />
          <Route
            path={`${routes.credentials}/:credentialId`}
            element={<div>Credential details</div>}
          />
          <Route path={routes.credentials} element={<div>Credentials list</div>} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('redirects to credentials list when credential id param is missing', () => {
    render(
      <MemoryRouter initialEntries={['/credentials/remove']}>
        <Routes>
          <Route path="/credentials/remove" element={<RemoveCredentialPage />} />
          <Route path={routes.credentials} element={<div>Credentials list</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Credentials list')).toBeDefined()
  })

  it('renders informational copy and expanded accordions by default', () => {
    renderPage()

    expect(screen.getByText('Remove credentials from your wallet')).toBeDefined()
    expect(
      screen.getByText(
        'You will lose your ability to prove the information on this credential with this Wallet.'
      )
    ).toBeDefined()
    expect(screen.getByText('You will not lose')).toBeDefined()
    expect(screen.getByText('How to get this credential back')).toBeDefined()
    expect(
      screen.getByText(
        'Your credential within the system that issued you your credential.'
      )
    ).toBeDefined()
    expect(
      screen.getByText(
        'You will have to go the organization that issued you this credential and request it again'
      )
    ).toBeDefined()
  })

  it('collapses accordion content when section header is clicked again', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'You will not lose' }))
    expect(
      screen.queryByText(
        'Your credential within the system that issued you your credential.'
      )
    ).toBeNull()
  })

  it('navigates back to credential details from header', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Back to credential details' }))
    expect(screen.getByText('Credential details')).toBeDefined()
  })

  it('calls delete API directly when Remove from wallet is clicked', async () => {
    mockedDeleteCredential.mockResolvedValue(undefined)
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Remove from wallet' }))

    await waitFor(() => {
      expect(mockedDeleteCredential).toHaveBeenCalledWith('cred-1')
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows loading label on the button while deleting', async () => {
    let resolveDelete: (() => void) | undefined
    mockedDeleteCredential.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve
        })
    )
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Remove from wallet' }))

    expect(screen.getByRole('button', { name: 'Removing…' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Removing…' })).toHaveProperty(
      'disabled',
      true
    )

    resolveDelete?.()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Remove from wallet' })).toBeDefined()
    })
  })

  it('navigates to credentials list after successful deletion', async () => {
    mockedDeleteCredential.mockResolvedValue(undefined)
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Remove from wallet' }))

    await waitFor(() => {
      expect(screen.getByText('Credentials list')).toBeDefined()
    })
  })

  it('shows friendly error in top banner on 403', async () => {
    mockedDeleteCredential.mockRejectedValue(
      new ApiError(403, 'Forbidden', {
        errorCode: 'forbidden',
        errorDescription: 'You cannot delete this credential.',
      })
    )
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Remove from wallet' }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent ?? '').toContain(
        'You cannot delete this credential.'
      )
    })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows friendly error in top banner on 404', async () => {
    mockedDeleteCredential.mockRejectedValue(
      new ApiError(404, 'Not found', {
        errorCode: 'credential_not_found',
        errorDescription: 'Credential was not found.',
      })
    )
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Remove from wallet' }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent ?? '').toContain(
        'Credential was not found.'
      )
    })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('maps unimplemented delete endpoint errors to a friendly message', async () => {
    mockedDeleteCredential.mockRejectedValue(
      new ApiError(404, 'DELETE /credentials/cred-1 failed with 404')
    )
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Remove from wallet' }))

    await waitFor(() => {
      expect(screen.getAllByRole('alert')[0]?.textContent ?? '').toContain(
        'This credential is no longer available in your wallet.'
      )
    })
  })
})
