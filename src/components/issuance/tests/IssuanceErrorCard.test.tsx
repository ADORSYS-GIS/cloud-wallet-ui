// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IssuanceErrorCard } from '../IssuanceErrorCard'

describe('IssuanceErrorCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows fallback message when both rawMessage and error are missing', () => {
    render(<IssuanceErrorCard error={null} onRetry={() => {}} />)
    expect(screen.getByText('An unknown error occurred.')).toBeDefined()
  })

  it('uses rawMessage over derived error message and triggers retry callback', () => {
    const onRetry = vi.fn()
    render(
      <IssuanceErrorCard
        error={{
          httpStatus: 400,
          error: 'invalid_request',
          error_description: null,
        }}
        rawMessage="Custom message"
        onRetry={onRetry}
      />
    )

    expect(screen.getByText('Custom message')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Scan again' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('derives user message from error when rawMessage is absent', () => {
    render(
      <IssuanceErrorCard
        error={{
          httpStatus: 400,
          error: 'invalid_tx_code',
          error_description: null,
        }}
        onRetry={() => {}}
      />
    )

    expect(screen.getByText('The transaction code is invalid. Check it and try again.')).toBeDefined()
  })
})
