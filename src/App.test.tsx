// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./pages/HomePage', () => ({
  HomePage: () => <div>Home page</div>,
}))

vi.mock('./pages/ScanPage', () => ({
  ScanPage: () => <div>Scan page</div>,
}))

vi.mock('./pages/CredentialTypesPage', () => ({
  CredentialTypesPage: () => <div>Credential types page</div>,
}))

vi.mock('./pages/CredentialsPage', () => ({
  CredentialsPage: () => <div>Credentials list page</div>,
}))

vi.mock('./pages/CredentialDetailPage', () => ({
  CredentialDetailPage: () => <div>Credential detail page</div>,
}))

describe('App routing - issuance success screen', () => {
  it('navigates to credentials list when Done is clicked', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/issuance/success')

    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(screen.getByText('Credentials list page')).toBeTruthy()
  })

  it('navigates to credential detail when View Credential is clicked', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/issuance/success/cred-123')

    render(<App />)

    await user.click(screen.getByRole('button', { name: 'View Credential' }))

    expect(screen.getByText('Credential detail page')).toBeTruthy()
  })
})
