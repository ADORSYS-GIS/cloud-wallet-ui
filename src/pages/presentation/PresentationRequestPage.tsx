import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PresentationCredentialSelection } from '../../components/presentation/PresentationCredentialSelection'
import { PresentationNoMatchingCredentials } from '../../components/presentation/PresentationNoMatchingCredentials'
import { PresentationPageShell } from '../../components/presentation/PresentationPageShell'
import { routes } from '../../constants/routes'
import { usePresentationSession } from '../../hooks/presentation/usePresentationSession'
import { usePresentationState } from '../../state/presentation.state'
import type { SelectedCredential } from '../../types/presentation'

/**
 * Proof Request screen — reached only after a successful scan and
 * POST /presentation/start on ScanPage.
 */
export function PresentationRequestPage() {
  const navigate = useNavigate()
  const { reset } = usePresentationSession()
  const presentation = usePresentationState()

  const isActiveFlow =
    presentation.status === 'selecting' || presentation.status === 'reviewing'

  useEffect(() => {
    if (!isActiveFlow) {
      navigate(routes.scan, { replace: true })
    }
  }, [isActiveFlow, navigate])

  const handleBack = () => {
    reset()
    navigate(routes.home)
  }

  const handleCredentialSelect = (selected: SelectedCredential) => {
    presentation.setSelectedCredentials([selected])
    presentation.setStatus('reviewing')
  }

  if (!isActiveFlow) {
    return null
  }

  const matchingCredentials = presentation.matchingCredentials ?? []

  return (
    <PresentationPageShell title="Proof Request" onBack={handleBack}>
      <section className="flex flex-1 flex-col">
        {presentation.status === 'selecting' && matchingCredentials.length === 0 && (
          <PresentationNoMatchingCredentials onBack={handleBack} />
        )}

        {presentation.status === 'selecting' && matchingCredentials.length > 0 && (
          <PresentationCredentialSelection
            matchingCredentials={matchingCredentials}
            onSelect={handleCredentialSelect}
          />
        )}

        {presentation.status === 'reviewing' && (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <p className="max-w-md text-base text-slate-700">
              Credential selected. Review and consent steps will continue here once the
              presentation flow is wired up.
            </p>
          </div>
        )}
      </section>
    </PresentationPageShell>
  )
}
