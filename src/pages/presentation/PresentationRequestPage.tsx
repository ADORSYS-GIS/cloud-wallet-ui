import { useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Footer } from '../../components/Footer'
import { PresentationCredentialSelection } from '../../components/presentation/PresentationCredentialSelection'
import { PresentationNoMatchingCredentials } from '../../components/presentation/PresentationNoMatchingCredentials'
import { PresentationPageShell } from '../../components/presentation/PresentationPageShell'
import {
  isPresentationMockVariant,
  mockPresentationStartResponse,
} from '../../dev/presentationMock'
import { routes } from '../../constants/routes'
import { usePresentationSession } from '../../hooks/presentation/usePresentationSession'
import { usePresentationState } from '../../state/presentation.state'
import type { CredentialSelection } from '../../types/presentation'
import { flattenCredentialMatches } from '../../utils/presentation/matchingCredentialDisplay'

/**
 * Proof Request — after a successful scan and POST /presentation/start.
 * Displays credential types returned by the backend for holder selection.
 *
 * Dev preview (no API): `/present?mock=presentation` or `/present?mock=presentation-empty`
 */
export function PresentationRequestPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { reset } = usePresentationSession()
  const {
    setStartResponse,
    setStatus,
    status,
    credential_matches,
    setSelectedCredentials,
  } = usePresentationState()
  const mockSeededRef = useRef(false)

  const mockVariant = import.meta.env.DEV ? searchParams.get('mock') : null
  const isMockPreview = isPresentationMockVariant(mockVariant)

  useEffect(() => {
    if (!isMockPreview || mockSeededRef.current) {
      return
    }
    mockSeededRef.current = true
    setStartResponse(mockPresentationStartResponse(mockVariant))
    setStatus('selecting')
  }, [isMockPreview, mockVariant, setStartResponse, setStatus])

  const isSelecting = status === 'selecting'

  useEffect(() => {
    if (isMockPreview || isSelecting) {
      return
    }
    navigate(routes.scan, { replace: true })
  }, [isSelecting, isMockPreview, navigate])

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
