import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import illuWalletError from '../../assets/illu-wallet-error.png'
import { PageContainer } from '../../components/layout/PageContainer'
import { routes } from '../../constants/routes'
import { usePresentationState } from '../../state/presentation.state'
import type { PresentationError } from '../../types/presentation'
import {
  logPresentationError,
  presentationErrorContent,
  resolvePresentationErrorVariant,
} from '../../utils/presentation/presentationErrorVariant'

function presentationErrorDisplayMessage(error: PresentationError): string {
  const variant = resolvePresentationErrorVariant(error)
  const content = presentationErrorContent(variant, error)
  return [content.title, content.message, content.guidance].filter(Boolean).join('\n\n')
}

type PresentationErrorScreenProps = {
  error: PresentationError
  onScanAgain: () => void
}

export function PresentationErrorScreen({
  error,
  onScanAgain,
}: PresentationErrorScreenProps) {
  const message = useMemo(() => presentationErrorDisplayMessage(error), [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center px-6 text-center">
        <div className="mb-16 flex flex-col items-center">
          <img
            src={illuWalletError}
            alt=""
            className="h-[132px] w-[122px] object-contain image-optimize-contrast"
          />
        </div>
        <div className="max-w-md whitespace-pre-line text-base text-slate-700">
          {message}
        </div>
        <button
          type="button"
          onClick={onScanAgain}
          className="mt-6 rounded-lg bg-[#99e827] px-8 py-2.5 text-base font-medium text-black shadow transition-colors hover:bg-[#66b80f] active:bg-[#5aa70d]"
        >
          Scan again
        </button>
      </div>
    </div>
  )
}

export function PresentationErrorPage() {
  const navigate = useNavigate()
  const presentation = usePresentationState()
  const error = presentation.error

  useEffect(() => {
    if (!error) {
      return
    }
    const variant = resolvePresentationErrorVariant(error)
    logPresentationError(error, variant)
  }, [error])

  if (presentation.status !== 'error' || !error) {
    return <Navigate to={routes.home} replace />
  }

  const handleScanAgain = () => {
    presentation.clear()
    navigate(`${routes.scan}?fresh=true`, { replace: true })
  }

  return (
    <PageContainer fullWidth>
      <PresentationErrorScreen error={error} onScanAgain={handleScanAgain} />
    </PageContainer>
  )
}
