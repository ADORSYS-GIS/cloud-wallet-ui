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
 * Proof Request — credential picker after POST /presentation/start.
 * Saves the holder's choice; Proof Details renders on the same route.
 */
export function PresentationRequestPage() {
  const navigate = useNavigate()
  const { reset } = usePresentationSession()
  const {
    status,
    credential_matches,
    selected_credentials,
    setSelectedCredentials,
    setStatus,
  } = usePresentationState()

  const isSelecting = status === 'selecting'
  const hasSelection = (selected_credentials?.length ?? 0) > 0
  const showCredentialPicker = isSelecting && !hasSelection

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
    setStatus('reviewing')
    navigate(routes.presentationProofDetails)
  }

  const selectableCredentials = useMemo(
    () => flattenCredentialMatches(credential_matches ?? []),
    [credential_matches]
  )

  if (!showCredentialPicker) {
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
