import { useEffect } from 'react'

type PageErrorBannerProps = {
  message: string
  onDismiss?: () => void
  /** Auto-hide after this many milliseconds (0 = no auto-hide). */
  autoHideMs?: number
}

export function PageErrorBanner({
  message,
  onDismiss,
  autoHideMs = 6000,
}: PageErrorBannerProps) {
  useEffect(() => {
    if (!onDismiss || autoHideMs <= 0) {
      return undefined
    }

    const timerId = window.setTimeout(onDismiss, autoHideMs)
    return () => {
      window.clearTimeout(timerId)
    }
  }, [autoHideMs, message, onDismiss])

  return (
    <div
      role="alert"
      className="border-b border-red-300 bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-sm"
    >
      <div className="flex w-full items-center gap-3">
        <p className="min-w-0 flex-1 text-center leading-snug">{message}</p>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="ml-auto shrink-0 rounded px-2 py-0.5 text-xl leading-none text-white/90 hover:bg-red-700 hover:text-white"
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
