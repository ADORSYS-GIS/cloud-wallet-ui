import { useEffect, useRef, useState } from 'react'
import type { TxCodeSpec } from '../../types/issuance'

type TxCodeInputProps = {
  txCodeSpec: TxCodeSpec
  sessionId: string
  onSubmit: (code: string) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
  error?: string | null
}

/**
 * Transaction Code input UI.
 *
 * Spec reference: POST /issuance/{session_id}/tx-code
 * Renders a numeric or text input based on `tx_code.input_mode`.
 * Validates length against `tx_code.length` when set.
 *
 * Per spec:
 * - If `tx_code.input_mode` is "numeric", value MUST contain only ASCII digits [0-9].
 * - If `tx_code.length` is set, value length MUST exactly match it.
 */
export function TxCodeInput({
  txCodeSpec,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: TxCodeInputProps) {
  const [code, setCode] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const isNumeric = txCodeSpec.input_mode === 'numeric'
  const expectedLength = txCodeSpec.length

  const validate = (value: string): string | null => {
    if (!value) return 'Please enter the transaction code.'
    if (isNumeric && !/^\d+$/.test(value)) {
      return 'Only digits (0–9) are allowed.'
    }
    if (expectedLength !== null && value.length !== expectedLength) {
      return `Code must be exactly ${expectedLength} character${expectedLength !== 1 ? 's' : ''}.`
    }
    return null
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const filtered = isNumeric ? raw.replace(/\D/g, '') : raw
    const clamped = expectedLength !== null ? filtered.slice(0, expectedLength) : filtered
    setCode(clamped)
    setValidationError(null)
  }

  const handleSubmit = async () => {
    const err = validate(code)
    if (err) {
      setValidationError(err)
      return
    }
    await onSubmit(code)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void handleSubmit()
    }
  }

  const displayError = validationError ?? error

  const useBoxedInput = isNumeric && expectedLength !== null && expectedLength <= 8

  return (
    <div
      className="absolute inset-x-3 top-3 z-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
      role="dialog"
      aria-modal="true"
      aria-label="Enter transaction code"
    >
      <div className="border-b border-slate-100 bg-[#f6f8fa] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Transaction Code Required
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          {txCodeSpec.input_mode === 'numeric' ? 'Numeric code' : 'Alphanumeric code'}
          {expectedLength !== null ? ` · ${expectedLength} digits` : ''}
        </p>
      </div>

      {txCodeSpec.description && (
        <div className="border-b border-slate-100 bg-amber-50 px-4 py-3">
          <p className="text-xs leading-relaxed text-amber-800">
            {txCodeSpec.description}
          </p>
        </div>
      )}

      <div className="px-4 py-4">
        {useBoxedInput ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2" aria-hidden="true">
              {Array.from({ length: expectedLength! }).map((_, i) => (
                <div
                  key={i}
                  className={[
                    'flex h-12 w-10 items-center justify-center rounded-lg border-2 text-xl font-bold transition-colors',
                    i < code.length
                      ? 'border-[#4b7c8c] bg-[#f0f7f9] text-slate-900'
                      : i === code.length
                        ? 'border-[#99e827] bg-white text-slate-900'
                        : 'border-slate-200 bg-slate-50 text-slate-400',
                  ].join(' ')}
                >
                  {code[i] ?? (i === code.length ? '|' : '')}
                </div>
              ))}
            </div>
            <input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              maxLength={expectedLength!}
              className="sr-only"
              aria-label="Transaction code"
              autoComplete="one-time-code"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              className="text-xs text-slate-500 underline underline-offset-2"
            >
              Tap to edit
            </button>
          </div>
        ) : (
          <input
            ref={inputRef}
            type={isNumeric ? 'tel' : 'text'}
            inputMode={isNumeric ? 'numeric' : 'text'}
            value={code}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isNumeric
                ? expectedLength
                  ? `Enter ${expectedLength}-digit code`
                  : 'Enter numeric code'
                : 'Enter transaction code'
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-3 text-center font-mono text-lg tracking-widest text-slate-900 placeholder:text-slate-400 focus:border-[#4b7c8c] focus:outline-none focus:ring-2 focus:ring-[#4b7c8c]/20 disabled:opacity-60"
            autoComplete="one-time-code"
            disabled={isSubmitting}
          />
        )}

        {displayError && (
          <p
            className="mt-2 text-center text-xs font-medium text-red-600"
            role="alert"
            aria-live="polite"
          >
            {displayError}
          </p>
        )}
      </div>

      <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={
            isSubmitting ||
            (expectedLength !== null ? code.length !== expectedLength : code.length === 0)
          }
          className="flex-1 rounded-lg bg-[#99e827] py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-[#8cd422] active:bg-[#7fc01f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />
              Submitting…
            </span>
          ) : (
            'Submit Code'
          )}
        </button>
      </div>
    </div>
  )
}
