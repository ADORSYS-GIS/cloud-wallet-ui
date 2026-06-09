// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeletePresentationActivityDialog } from '../DeletePresentationActivityDialog'

describe('DeletePresentationActivityDialog', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <DeletePresentationActivityDialog
        open={false}
        deleting={false}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('shows confirmation copy when open', () => {
    render(
      <DeletePresentationActivityDialog
        open
        deleting={false}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByRole('alertdialog')).toBeDefined()
    expect(screen.getByText('Confirm Deletion')).toBeDefined()
    expect(
      screen.getByText(
        'Are you sure you want to permanently delete this activity from your wallet? Once deleted, it cannot be recovered.'
      )
    ).toBeDefined()
  })

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn()

    render(
      <DeletePresentationActivityDialog
        open
        deleting={false}
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when the close button is clicked', () => {
    const onCancel = vi.fn()

    render(
      <DeletePresentationActivityDialog
        open
        deleting={false}
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onConfirm when Yes, delete activity is clicked', () => {
    const onConfirm = vi.fn()

    render(
      <DeletePresentationActivityDialog
        open
        deleting={false}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete activity' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('shows deleting state and disables actions while deletion is in progress', () => {
    render(
      <DeletePresentationActivityDialog
        open
        deleting
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDefined()
    expect(
      screen.getByRole('button', { name: 'Cancel' }).getAttribute('disabled')
    ).not.toBeNull()
    expect(
      screen.getByRole('button', { name: 'Deleting…' }).getAttribute('disabled')
    ).not.toBeNull()
  })
})
