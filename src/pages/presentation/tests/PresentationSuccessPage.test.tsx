// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { useState } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { routes } from '../../../constants/routes'
import {
  PresentationProvider,
  usePresentationState,
} from '../../../state/presentation.state'
import { PresentationSuccessPage } from '../PresentationSuccessPage'

function HomeStub() {
  return <div>Home dashboard</div>
}

function SeedSuccessState({ children }: { children: ReactNode }) {
  const presentation = usePresentationState()
  const [seeded, setSeeded] = useState(false)

  if (!seeded && presentation.status !== 'success') {
    return (
      <button
        type="button"
        data-testid="seed-success"
        onClick={() => {
          presentation.setConsentResponse({
            status: 'completed',
            redirect_uri: null,
            verifier_response: null,
          })
          setSeeded(true)
        }}
      >
        seed success
      </button>
    )
  }

  return children
}

function renderSuccessPage(options?: { seedSuccess?: boolean }) {
  const { seedSuccess = true } = options ?? {}

  const routesTree = (
    <MemoryRouter initialEntries={[routes.presentationSuccess]}>
      <Routes>
        <Route path={routes.presentationSuccess} element={<PresentationSuccessPage />} />
        <Route path={routes.home} element={<HomeStub />} />
      </Routes>
    </MemoryRouter>
  )

  const view = render(
    <PresentationProvider>
      {seedSuccess ? <SeedSuccessState>{routesTree}</SeedSuccessState> : routesTree}
    </PresentationProvider>
  )

  if (seedSuccess) {
    act(() => {
      screen.getByTestId('seed-success').click()
    })
  }

  return view
}

describe('PresentationSuccessPage', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('renders success heading and primary action', () => {
    renderSuccessPage()

    expect(
      screen.getByRole('heading', { name: 'Information sent successfully' })
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Go back home' })).toBeTruthy()
  })

  it('redirects to home when presentation flow is not in success state', () => {
    renderSuccessPage({ seedSuccess: false })

    expect(screen.getByText('Home dashboard')).toBeTruthy()
    expect(
      screen.queryByRole('heading', { name: 'Information sent successfully' })
    ).toBeNull()
  })

  it('clears presentation state and navigates home from Go back home', async () => {
    const user = userEvent.setup()
    renderSuccessPage()

    await user.click(screen.getByRole('button', { name: 'Go back home' }))

    expect(screen.getByText('Home dashboard')).toBeTruthy()
    expect(localStorage.getItem('cloud_wallet_presentation_flow')).toBeNull()
  })
})
