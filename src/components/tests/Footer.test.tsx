// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Footer } from '../Footer'
import { routes } from '../../constants/routes'

describe('Footer', () => {
  afterEach(() => {
    cleanup()
  })

  it('calls onScanClick when scan button is pressed', () => {
    const onScanClick = vi.fn()
    render(
      <MemoryRouter initialEntries={[routes.home]}>
        <Footer onScanClick={onScanClick} scanDisabled={false} />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Scan credential offer QR' }))
    expect(onScanClick).toHaveBeenCalledOnce()
  })

  it('sets aria-current for creds link when credentials route is active', () => {
    render(
      <MemoryRouter initialEntries={[routes.credentials]}>
        <Footer onScanClick={() => {}} scanDisabled={false} />
      </MemoryRouter>
    )

    const credsLink = screen
      .getAllByRole('link', { name: /creds/i })
      .find((link) => link.getAttribute('aria-current') === 'page')
    if (!credsLink) {
      throw new Error('Expected creds link with aria-current=page')
    }
    expect(credsLink.getAttribute('aria-current')).toBe('page')
  })

  it('uses compact aria-label when labels are hidden', () => {
    render(
      <MemoryRouter initialEntries={[routes.home]}>
        <Footer onScanClick={() => {}} scanDisabled={false} showLabels={false} />
      </MemoryRouter>
    )

    const credsLinks = screen.getAllByRole('link', { name: 'Creds' })
    expect(credsLinks.length).toBe(1)
    expect(screen.queryByText('Creds')).toBeNull()
  })
})
