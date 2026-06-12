import { useEffect, useMemo } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import illuWallet from '../../assets/illu-wallet.png'
import { PresentationPageShell } from '../../components/presentation/PresentationPageShell'
import { routes } from '../../constants/routes'
import { usePresentationState } from '../../state/presentation.state'
import type {
  PresentationError,
  PresentationErrorNavigationState,
} from '../../types/presentation'
import {
  logPresentationError,
  presentationErrorActions,
  presentationErrorContent,
  resolvePresentationErrorVariant,
} from '../../utils/presentation/presentationErrorVariant'

type PresentationErrorScreenProps = {
  error: PresentationError
  retryPath?: string
  onReturnHome: () => void
  onStartOver: () => void
  onRetry: () => void
}

export function PresentationErrorScreen({
  error,
  retryPath,
  onReturnHome,
  onStartOver,
  onRetry,
}: PresentationErrorScreenProps) {
  const variant = useMemo(() => resolvePresentationErrorVariant(error), [error])
  const content = useMemo(
    () => presentationErrorContent(variant, error),
    [variant, error]
  )
  const actions = useMemo(() => presentationErrorActions(variant), [variant])
  const showRetry = actions.canRetry && Boolean(retryPath)

  return (
    <div className="flex flex-1 flex-col">
      <section
        className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center"
        aria-labelledby="presentation-error-heading"
      >
        <div className="relative mb-10 h-52 w-52">
          <div className="absolute inset-0 rounded-full ring-[6px] ring-transparent" />
          <div className="absolute inset-0 animate-spin rounded-full border-[8px] border-[#99e827] border-t-transparent border-r-transparent" />
          <img
            src={illuWallet}
            alt=""
            className="absolute inset-8 m-auto h-[calc(100%-4rem)] w-[calc(100%-4rem)] object-contain"
          />
        </div>

        <h1
          id="presentation-error-heading"
          className="max-w-md text-[clamp(18px,2.6vw,22px)] font-semibold text-slate-900"
        >
          {content.title}
        </h1>
        <p className="mt-4 max-w-md text-base text-slate-700">{content.message}</p>
        {content.guidance && (
          <p className="mt-3 max-w-md text-sm text-slate-600">{content.guidance}</p>
        )}
      </section>

      <div className="flex flex-col gap-2 px-4 pb-4">
        {showRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="h-10 w-full rounded-[4px] bg-[#99e827] text-[16px] font-normal text-slate-900 transition-colors duration-150 hover:bg-[#89d61f] active:bg-[#7dc31a]"
          >
            Try again
          </button>
        )}
        {actions.canStartOver && (
          <button
            type="button"
            onClick={onStartOver}
            className={[
              'h-10 w-full rounded-[4px] text-[16px] font-normal transition-colors duration-150',
              showRetry
                ? 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
                : 'bg-[#99e827] text-slate-900 hover:bg-[#89d61f] active:bg-[#7dc31a]',
            ].join(' ')}
          >
            Start over
          </button>
        )}
        <button
          type="button"
          onClick={onReturnHome}
          className={[
            'h-10 w-full rounded-[4px] text-[16px] font-normal transition-colors duration-150',
            showRetry || actions.canStartOver
              ? 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
              : 'bg-[#99e827] text-slate-900 hover:bg-[#89d61f] active:bg-[#7dc31a]',
          ].join(' ')}
        >
          Return to Wallet
        </button>
      </div>
    </div>
  )
}

export function PresentationErrorPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const presentation = usePresentationState()
  const navigationState = location.state as PresentationErrorNavigationState | null
  const retryPath = navigationState?.retryPath

  const error = presentation.error

  useEffect(() => {
    if (!error) {
      return
    }
    const variant = resolvePresentationErrorVariant(error)
    logPresentationError(error, variant, { retryPath: retryPath ?? null })
  }, [error, retryPath])

  if (presentation.status !== 'error' || !error) {
    return <Navigate to={routes.home} replace />
  }

  const handleReturnHome = () => {
    presentation.clear()
    navigate(routes.home, { replace: true })
  }

  const handleStartOver = () => {
    presentation.clear()
    navigate(`${routes.scan}?fresh=true`, { replace: true })
  }

  const handleRetry = () => {
    if (!retryPath) {
      return
    }
    presentation.clear()
    navigate(retryPath, { replace: true })
  }

  const handleBack = () => {
    handleReturnHome()
  }

  return (
    <PresentationPageShell title="Proof Request" onBack={handleBack}>
      <PresentationErrorScreen
        error={error}
        retryPath={retryPath}
        onReturnHome={handleReturnHome}
        onStartOver={handleStartOver}
        onRetry={handleRetry}
      />
    </PresentationPageShell>
  )
}
