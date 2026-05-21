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

function renderSuccessAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routes.issuanceSuccess} element={<IssuanceSuccessPage />} />
        <Route path={routes.credentials} element={<CredentialsListStub />} />
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
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy()
  })

  it('navigates to credentials list from Done', async () => {
    const user = userEvent.setup()
    renderSuccessAt('/issuance/success')

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(screen.getByText('Credentials list')).toBeTruthy()
  })
})
