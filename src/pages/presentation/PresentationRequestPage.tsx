import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Footer } from '../../components/Footer'
import { PresentationCredentialSelection } from '../../components/presentation/PresentationCredentialSelection'
import { PresentationNoMatchingCredentials } from '../../components/presentation/PresentationNoMatchingCredentials'
import { PresentationPageShell } from '../../components/presentation/PresentationPageShell'
import { routes } from '../../constants/routes'
import { usePresentationSession } from '../../hooks/presentation/usePresentationSession'
import { usePresentationState } from '../../state/presentation.state'
import type { CredentialSelection } from '../../types/presentation'
import { flattenCredentialMatches } from '../../utils/presentation/matchingCredentialDisplay'

/**
 * Proof Request — after a successful scan and POST /presentation/start.
 * Displays credential types returned by the backend for holder selection.
 */
export function PresentationRequestPage() {
  const navigate = useNavigate()
  const { reset } = usePresentationSession()
  const { status, credential_matches, setSelectedCredentials } = usePresentationState()

  const isSelecting = status === 'selecting'

  useEffect(() => {
    if (!isSelecting) {
      navigate(routes.scan, { replace: true })
    }
  }, [isSelecting, navigate])

  const handleBack = () => {
    reset()
    navigate(routes.home)
  }

  const handleCredentialSelect = (selected: CredentialSelection) => {
    setSelectedCredentials([selected])
  }

  const selectableCredentials = useMemo(
    () => flattenCredentialMatches(credential_matches ?? []),
    [credential_matches]
  )

  if (!isSelecting) {
    return null
  }

  return (
    <PresentationPageShell title="Proof Request" onBack={handleBack}>
      <section className="flex flex-1 flex-col bg-[#e9ecef]">
        {selectableCredentials.length === 0 ? (
          <PresentationNoMatchingCredentials onBack={handleBack} />
        ) : (
          <PresentationCredentialSelection
            credentials={selectableCredentials}
            onSelect={handleCredentialSelect}
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
