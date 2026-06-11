// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { useLayoutEffect, useRef, useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
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
  const [ready, setReady] = useState(false)
  const seeded = useRef(false)

  useLayoutEffect(() => {
    if (seeded.current) {
      return
    }
    seeded.current = true
    presentation.setSubmissionResult({
      success: true,
      redirect_uri: 'https://verifier.example/callback',
    })
    setReady(true)
  })

  if (!ready) {
    return null
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

  return render(
    <PresentationProvider>
      {seedSuccess ? <SeedSuccessState>{routesTree}</SeedSuccessState> : routesTree}
    </PresentationProvider>
  )
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
