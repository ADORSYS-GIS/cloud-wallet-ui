import type { IssuanceApiError } from '../../types/issuance'

type ErrorMeta = {
  title: string
  icon: string
}

function errorMeta(apiError: IssuanceApiError): ErrorMeta {
  switch (apiError.error) {
    case 'invalid_credential_offer':
      return {
        title: 'Invalid QR Code',
        icon: '⚠️',
      }
    case 'unauthorized':
      return {
        title: 'Authentication Failed',
        icon: '🔐',
      }
    case 'issuer_metadata_fetch_failed':
    case 'auth_server_metadata_fetch_failed':
      return {
        title: 'Issuer Unreachable',
        icon: '📡',
      }
    case 'internal_error':
      return {
        title: 'Server Error',
        icon: '🔧',
      }
    default:
      return apiError.httpStatus >= 500
        ? { title: 'Server Error', icon: '🔧' }
        : { title: 'Offer Error', icon: '⚠️' }
  }
}

type IssuanceErrorCardProps = {
  apiError?: IssuanceApiError
  userMessage?: string
  onRetry: () => void
  onBack?: () => void
  retryLabel?: string
  backLabel?: string
  showRetry?: boolean
  showBack?: boolean
  variant?: 'inline' | 'fullscreen'
  illustrationSrc?: string
}

export function IssuanceErrorCard({
  apiError = {
    httpStatus: 0,
    error: 'internal_error',
    error_description: null,
  },
  userMessage = 'The request could not be completed. Please try again.',
  onRetry,
  onBack,
  retryLabel = 'Try again',
  backLabel = 'Restart flow',
  showRetry = true,
  showBack = true,
  variant = 'inline',
  illustrationSrc,
}: IssuanceErrorCardProps) {
  const isFullscreen = variant === 'fullscreen'
  const meta = errorMeta(apiError)

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div
          className="flex flex-col items-center px-6 text-center"
          role="alert"
          aria-live="assertive"
        >
          <div className="relative mb-16 h-52 w-52">
            <div className="absolute inset-0 rounded-full ring-[6px] ring-transparent" />
            <div className="absolute inset-0 animate-spin rounded-full border-[8px] border-[#99e827] border-t-transparent border-r-transparent" />
            {illustrationSrc && (
              <img
                src={illustrationSrc}
                alt=""
                className="absolute inset-8 m-auto h-[calc(100%-4rem)] w-[calc(100%-4rem)] object-contain"
              />
            )}
          </div>
          <div className="text-base text-slate-700">{userMessage}</div>
          {showRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-6 rounded-lg bg-[#99e827] px-8 py-2.5 text-base font-medium text-black shadow transition-colors hover:bg-[#66b80f] active:bg-[#5aa70d]"
            >
              {retryLabel}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="absolute inset-x-3 top-3 z-20 overflow-hidden rounded-xl border border-red-100 bg-white shadow-xl"
      role="alert"
      aria-live="assertive"
    >
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

      <div className="px-4 py-4">
        <p className="text-sm leading-relaxed text-slate-700">{userMessage}</p>
      </div>

      <div className="border-t border-slate-100 px-4 py-3">
        {showRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="w-full rounded-lg bg-[#99e827] py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#8cd422] active:bg-[#7fc01f]"
          >
            {retryLabel}
          </button>
        )}
        {showBack && onBack && (
          <button
            type="button"
            onClick={onBack}
            className={`w-full rounded-lg border border-slate-200 bg-white py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 ${showRetry ? 'mt-2' : ''}`}
          >
            {backLabel}
          </button>
        )}
      </div>
    </div>
  )
}

type ScanIssuanceErrorOverlayProps = {
  localScanErrorMessage: string | null
  remoteError: IssuanceApiError | null
  remoteErrorMessage?: string | null
  onRetry: () => void
  illustrationSrc?: string
  retryLabel?: string
}

export function ScanIssuanceErrorOverlay({
  localScanErrorMessage,
  remoteError,
  remoteErrorMessage = null,
  onRetry,
  illustrationSrc,
  retryLabel = 'Scan again',
}: ScanIssuanceErrorOverlayProps) {
  if (!localScanErrorMessage && !remoteError) return null

  const userMessage =
    localScanErrorMessage ??
    remoteErrorMessage ??
    'The request could not be completed. Please try again.'

  return (
    <IssuanceErrorCard
      apiError={
        remoteError ?? {
          httpStatus: 0,
          error: 'internal_error',
          error_description: null,
        }
      }
      userMessage={userMessage}
      onRetry={onRetry}
      retryLabel={retryLabel}
      showBack={false}
      variant="fullscreen"
      illustrationSrc={illustrationSrc}
    />
  )
}
