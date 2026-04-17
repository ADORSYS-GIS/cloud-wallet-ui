// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { routes } from '../../constants/routes'
import { IssuanceSuccessPage } from '../IssuanceSuccessPage'

function CredentialsListStub() {
  return <div>Credentials list</div>
}

function CredentialDetailStub() {
  return <div>Credential detail</div>
}

function renderSuccessAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routes.issuanceSuccess} element={<IssuanceSuccessPage />} />
        <Route path={routes.credentials} element={<CredentialsListStub />} />
        <Route
          path={`${routes.credentials}/:credentialId`}
          element={<CredentialDetailStub />}
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('IssuanceSuccessPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders success heading and primary actions', () => {
    renderSuccessAt('/issuance/success')

    expect(
      screen.getByRole('heading', { name: 'Credential added to your wallet' })
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'View Credential' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy()
  })

  it('navigates to GET /credentials/:id route when credential id is in the path', async () => {
    const user = userEvent.setup()
    renderSuccessAt('/issuance/success/c3d4e5f6-7890-abcd-ef12-3456789abcde')

    await user.click(screen.getByRole('button', { name: 'View Credential' }))

    expect(screen.getByText('Credential detail')).toBeTruthy()
  })

  it('navigates to credential detail when credential id is only in the query string', async () => {
    const user = userEvent.setup()
    renderSuccessAt('/issuance/success?credentialId=c3d4e5f6-7890-abcd-ef12-3456789abcde')

    await user.click(screen.getByRole('button', { name: 'View Credential' }))

    expect(screen.getByText('Credential detail')).toBeTruthy()
  })

  it('navigates to credential detail when credential id is provided via router state', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/issuance/success',
            state: {
              credentialId: 'c3d4e5f6-7890-abcd-ef12-3456789abcde',
            },
          },
        ]}
      >
        <Routes>
          <Route path={routes.issuanceSuccess} element={<IssuanceSuccessPage />} />
          <Route path={routes.credentials} element={<CredentialsListStub />} />
          <Route
            path={`${routes.credentials}/:credentialId`}
            element={<CredentialDetailStub />}
          />
        </Routes>
      </MemoryRouter>
    )

    await user.click(screen.getByRole('button', { name: 'View Credential' }))

    expect(screen.getByText('Credential detail')).toBeTruthy()
  })

  it('navigates to credentials list when no credential id is available', async () => {
    const user = userEvent.setup()
    renderSuccessAt('/issuance/success')

    await user.click(screen.getByRole('button', { name: 'View Credential' }))

    expect(screen.getByText('Credentials list')).toBeTruthy()
  })

  it('navigates to credentials list from Done', async () => {
    const user = userEvent.setup()
    renderSuccessAt('/issuance/success')

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(screen.getByText('Credentials list')).toBeTruthy()
  })
})
