import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Footer } from '../../components/Footer'
import { PresentationMultiQuerySelection } from '../../components/presentation/PresentationMultiQuerySelection'
import { PresentationNoMatchingCredentials } from '../../components/presentation/PresentationNoMatchingCredentials'
import { PresentationPageShell } from '../../components/presentation/PresentationPageShell'
import { routes } from '../../constants/routes'
import { usePresentationSession } from '../../hooks/presentation/usePresentationSession'
import { usePresentationState } from '../../state/presentation.state'
import type { CredentialSelection } from '../../types/presentation'

/**
 * Proof Request — after a successful scan and POST /presentation/start.
 * Displays credential matches grouped by query_id for holder selection.
 */
export function PresentationRequestPage() {
  const navigate = useNavigate()
  const { reset } = usePresentationSession()
  const {
    status,
    credential_matches,
    expires_at,
    setSelectedCredentials,
    setStatus,
    setError,
  } = usePresentationState()

  const isSelecting = status === 'selecting'

  useEffect(() => {
    if (expires_at && new Date(expires_at) <= new Date()) {
      setError({
        code: 'session_not_found',
        message:
          'This proof request is no longer valid. Presentation sessions expire after a short time for your security.',
        error_description:
          'Ask the verifier to generate a new QR code or link, then scan it again.',
      })
      navigate(routes.presentationError, { replace: true })
      return
    }
    if (status === 'idle' || status === 'loading' || status === 'error') {
      navigate(routes.scan, { replace: true })
    }
  }, [status, navigate, expires_at, setError])

  const handleBack = () => {
    reset()
    navigate(routes.home)
  }

  const handleContinue = (selections: CredentialSelection[]) => {
    setSelectedCredentials(selections)
    setStatus('reviewing')
    navigate(routes.presentationProofDetails)
  }

  const hasAnyCandidates = useMemo(
    () => (credential_matches ?? []).some((match) => match.candidates.length > 0),
    [credential_matches]
  )

  if (!isSelecting) {
    return null
  }

  return (
    <PresentationPageShell title="Proof Request" onBack={handleBack}>
      <section className="flex flex-1 flex-col bg-[#e9ecef]">
        {(credential_matches ?? []).length === 0 || !hasAnyCandidates ? (
          <PresentationNoMatchingCredentials onBack={handleBack} />
        ) : (
          <PresentationMultiQuerySelection
            matches={credential_matches ?? []}
            onContinue={handleContinue}
          />
        )}
      </section>

      <Footer
        activeTab="home"
        onScanClick={() => navigate(`${routes.scan}?fresh=true`)}
        scanDisabled={false}
      />
    </PresentationPageShell>
  )
}
