// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TxCodeInput } from '../TxCodeInput'

describe('TxCodeInput', () => {
  afterEach(() => {
    cleanup()
  })

  it('filters non-digits from numeric input before submit', async () => {
    const onSubmit = vi.fn(async () => {})
    render(
      <TxCodeInput
        txCodeSpec={{ input_mode: 'numeric', length: null, description: null }}
        sessionId="ses_1"
        onSubmit={onSubmit}
        onCancel={() => {}}
        isSubmitting={false}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '12a3' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('123')
    })
  })

  it('shows required validation message when submitting empty code via Enter', async () => {
    const onSubmit = vi.fn(async () => {})
    render(
      <TxCodeInput
        txCodeSpec={{ input_mode: 'numeric', length: null, description: null }}
        sessionId="ses_1"
        onSubmit={onSubmit}
        onCancel={() => {}}
        isSubmitting={false}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.keyDown(input, { key: 'Enter' })
    const alert = await screen.findByRole('alert')
    expect(alert.textContent ?? '').toContain('Please enter the transaction code.')
  })

  it('focuses hidden input when tapping edit in boxed mode', async () => {
    const onSubmit = vi.fn(async () => {})
    render(
      <TxCodeInput
        txCodeSpec={{ input_mode: 'numeric', length: 6, description: null }}
        sessionId="ses_1"
        onSubmit={onSubmit}
        onCancel={() => {}}
        isSubmitting={false}
      />
    )

    const hiddenInput = screen.getByRole('textbox', { hidden: true })
    fireEvent.click(screen.getByRole('button', { name: 'Tap to edit' }))
    expect(document.activeElement).toBe(hiddenInput)
  })

  it('submits code successfully from text mode', async () => {
    const onSubmit = vi.fn(async () => {})
    render(
      <TxCodeInput
        txCodeSpec={{ input_mode: 'text', length: null, description: null }}
        sessionId="ses_1"
        onSubmit={onSubmit}
        onCancel={() => {}}
        isSubmitting={false}
      />
    )

    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'code-123')
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('code-123')
    })
  })

  it('shows exact-length validation for text mode when length is configured', async () => {
    const onSubmit = vi.fn(async () => {})
    render(
      <TxCodeInput
        txCodeSpec={{ input_mode: 'text', length: 4, description: null }}
        sessionId="ses_1"
        onSubmit={onSubmit}
        onCancel={() => {}}
        isSubmitting={false}
      />
    )

    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'abc')
    fireEvent.keyDown(input, { key: 'Enter' })

    const alert = await screen.findByRole('alert')
    expect(alert.textContent ?? '').toContain('Code must be exactly 4 characters.')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('renders numeric placeholder with explicit digit length in non-boxed mode', () => {
    render(
      <TxCodeInput
        txCodeSpec={{ input_mode: 'numeric', length: 9, description: null }}
        sessionId="ses_1"
        onSubmit={vi.fn(async () => {})}
        onCancel={() => {}}
        isSubmitting={false}
      />
    )

    expect(screen.getByPlaceholderText('Enter 9-digit code')).toBeDefined()
  })

  it('shows required message when expected length is 1 and input is empty', async () => {
    render(
      <TxCodeInput
        txCodeSpec={{ input_mode: 'text', length: 1, description: null }}
        sessionId="ses_1"
        onSubmit={vi.fn(async () => {})}
        onCancel={() => {}}
        isSubmitting={false}
      />
    )

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    const alert = await screen.findByRole('alert')
    expect(alert.textContent ?? '').toContain('Please enter the transaction code.')
  })

  it('shows required message in numeric mode when expected length is 1 and input is empty', async () => {
    render(
      <TxCodeInput
        txCodeSpec={{ input_mode: 'numeric', length: 1, description: null }}
        sessionId="ses_1"
        onSubmit={vi.fn(async () => {})}
        onCancel={() => {}}
        isSubmitting={false}
      />
    )

    fireEvent.keyDown(screen.getByRole('textbox', { hidden: true }), { key: 'Enter' })
    const alert = await screen.findByRole('alert')
    expect(alert.textContent ?? '').toContain('Please enter the transaction code.')
  })
})
