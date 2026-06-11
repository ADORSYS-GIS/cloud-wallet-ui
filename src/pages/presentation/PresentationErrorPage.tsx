import { Navigate, useNavigate } from 'react-router-dom'
import { PresentationErrorCard } from '../../components/presentation/PresentationErrorCard'
import { PresentationPageShell } from '../../components/presentation/PresentationPageShell'
import { routes } from '../../constants/routes'
import { usePresentationState } from '../../state/presentation.state'

const DEFAULT_ERROR = {
  code: 'submission_failed' as const,
  message: 'Presentation submission failed.',
}

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

  return (
    <PresentationPageShell title="Proof Request" onBack={handleBack}>
      <PresentationErrorCard
        error={presentation.error ?? DEFAULT_ERROR}
        onRetry={handleRetry}
        retryLabel="Scan QR code"
      />
    </PresentationPageShell>
  )
}
