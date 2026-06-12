// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CameraAccessDialog } from '../CameraAccessDialog'

describe('CameraAccessDialog', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows denied guidance and triggers retry and go-home callbacks', () => {
    const onRetry = vi.fn()
    const onGoHome = vi.fn()

    render(<CameraAccessDialog issue="denied" onRetry={onRetry} onGoHome={onGoHome} />)

    expect(screen.getByText(/Camera permission was denied/i)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    fireEvent.click(screen.getByRole('button', { name: 'Go back home' }))
    expect(onRetry).toHaveBeenCalledOnce()
    expect(onGoHome).toHaveBeenCalledOnce()
  })

  it('uses a custom message for unavailable camera issues', () => {
    render(
      <CameraAccessDialog
        issue="unavailable"
        message="Video preview unavailable."
        onRetry={() => {}}
        onGoHome={() => {}}
      />
    )

    expect(screen.getByText('Video preview unavailable.')).toBeDefined()
  })
})
