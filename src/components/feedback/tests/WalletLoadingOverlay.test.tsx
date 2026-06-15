// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { WalletLoadingOverlay } from '../WalletLoadingOverlay'

describe('WalletLoadingOverlay', () => {
  afterEach(() => cleanup())

  it('renders wallet spinner with optional message', () => {
    render(<WalletLoadingOverlay message="Sharing…" />)

    expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true')
    expect(screen.getByText('Sharing…')).toBeTruthy()
  })
})
