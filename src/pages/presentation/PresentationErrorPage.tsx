import { Navigate, useNavigate } from 'react-router-dom'
import { PresentationErrorCard } from '../../components/presentation/PresentationErrorCard'
import { PresentationPageShell } from '../../components/presentation/PresentationPageShell'
import { routes } from '../../constants/routes'
import { usePresentationState } from '../../state/presentation.state'

export function PresentationErrorPage() {
  const navigate = useNavigate()
  const presentation = usePresentationState()

  const error = presentation.error

  if (!error) {
    return <Navigate to={routes.home} replace />
  }

  const handleRetry = () => {
    if (
      presentation.error?.code === 'presentation_build_failed' ||
      presentation.error?.code === 'verifier_submission_failed' ||
      presentation.error?.code === 'invalid_credential_selection' ||
      presentation.error?.code === 'transaction_data_not_acknowledged'
    ) {
      navigate(routes.presentationProofDetails)
    } else if (
      presentation.error?.code === 'session_not_found' ||
      presentation.error?.code === 'invalid_request'
    ) {
      navigate(`${routes.scan}?fresh=true`)
    } else {
      presentation.clear()
      navigate(routes.home)
    }
  }

  const handleGoHome = () => {
    presentation.clear()
    navigate(routes.home)
  }

  return (
    <PresentationPageShell title="Error" onBack={handleGoHome}>
      <PresentationErrorCard error={error} onRetry={handleRetry} retryLabel="Try again" />
    </PresentationPageShell>
  )
}
