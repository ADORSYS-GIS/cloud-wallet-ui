import type { IssuanceApiError } from '../../types/issuance'

// ---------------------------------------------------------------------------
// Maps machine-readable error codes to UI-friendly icons and titles.
// ---------------------------------------------------------------------------

type ErrorMeta = {
  title: string
  icon: string
  /** When true, a "Scan again" CTA is shown. When false, only "Go back". */
  allowRetry: boolean
}

function errorMeta(apiError: IssuanceApiError): ErrorMeta {
  switch (apiError.error) {
    case 'invalid_credential_offer':
      return {
        title: 'Invalid QR Code',
        icon: '⚠️',
        allowRetry: true,
      }
    case 'unauthorized':
      return {
        title: 'Authentication Failed',
        icon: '🔐',
        allowRetry: false,
      }
    case 'issuer_metadata_fetch_failed':
    case 'auth_server_metadata_fetch_failed':
      return {
        title: 'Issuer Unreachable',
        icon: '📡',
        allowRetry: true,
      }
    case 'internal_error':
      return {
        title: 'Server Error',
        icon: '🔧',
        allowRetry: true,
      }
    default:
      return apiError.httpStatus >= 500
        ? { title: 'Server Error', icon: '🔧', allowRetry: true }
        : { title: 'Offer Error', icon: '⚠️', allowRetry: true }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type IssuanceErrorCardProps = {
  apiError: IssuanceApiError
  userMessage: string
  onRetry: () => void
  onBack: () => void
}

export function IssuanceErrorCard({
  apiError,
  userMessage,
  onRetry,
  onBack,
}: IssuanceErrorCardProps) {
  const meta = errorMeta(apiError)

  return (
    <div
      className="absolute inset-x-3 top-3 z-20 overflow-hidden rounded-xl border border-red-100 bg-white shadow-xl"
      role="alert"
      aria-live="assertive"
    >
      {/* Header */}
      <div className="border-b border-red-100 bg-red-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            {meta.icon}
          </span>
          <p className="text-sm font-semibold text-red-800">{meta.title}</p>
        </div>
        {apiError.httpStatus > 0 && (
          <p className="mt-0.5 text-[11px] text-red-400">
            HTTP {apiError.httpStatus}
            {' · '}
            <span className="font-mono">{apiError.error}</span>
          </p>
        )}
      </div>

      {/* Message */}
      <div className="px-4 py-4">
        <p className="text-sm leading-relaxed text-slate-700">{userMessage}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100"
        >
          Go back
        </button>
        {meta.allowRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 rounded-lg bg-[#4b7c8c] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3f6f7e] active:bg-[#366070]"
          >
            Scan again
          </button>
        )}
      </div>
    </div>
  )
}