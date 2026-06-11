import { Navigate, useNavigate } from 'react-router-dom'
import { PresentationErrorCard } from '../../components/presentation/PresentationErrorCard'
import { PresentationPageShell } from '../../components/presentation/PresentationPageShell'
import { routes } from '../../constants/routes'
import { usePresentationState } from '../../state/presentation.state'

const DEFAULT_ERROR = {
  code: 'submission_failed' as const,
  message: 'Presentation submission failed.',
}

/**
 * Shown when consent submission fails or the user declines (issue #90 / #92).
 */
export function PresentationErrorPage() {
  const navigate = useNavigate()
  const presentation = usePresentationState()

  if (presentation.status !== 'error') {
    return <Navigate to={routes.home} replace />
  }

  const handleBack = () => {
    presentation.clear()
    navigate(routes.home)
  }

  const handleRetry = () => {
    presentation.clear()
    navigate(routes.scan)
  }

  const canRetry = presentation.error?.code !== 'user_rejected'

  return (
    <PresentationPageShell title="Proof Request" onBack={handleBack}>
      <PresentationErrorCard
        error={presentation.error ?? DEFAULT_ERROR}
        onRetry={canRetry ? handleRetry : undefined}
        retryLabel="Scan QR code"
      />
    </PresentationPageShell>
  )
}
