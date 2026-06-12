import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PresentationPageShell } from '../../components/presentation/PresentationPageShell'
import { routes } from '../../constants/routes'
import { usePresentationSession } from '../../hooks/presentation/usePresentationSession'
import { usePresentationState } from '../../state/presentation.state'
import type { CredentialMatch } from '../../types/presentation'
import { ProofDetailsPage } from './ProofDetailsPage'

function filterMatchesForSelection(
  credentialMatches: CredentialMatch[],
  selectedCredentialIds: Map<string, string>
): CredentialMatch[] {
  return credentialMatches
    .map((match) => {
      const selectedId = selectedCredentialIds.get(match.query_id)
      if (!selectedId) return match

      return {
        ...match,
        candidates: match.candidates.filter(
          (candidate) => candidate.credential_id === selectedId
        ),
      }
    })
    .filter((match) => match.candidates.length > 0)
}

/**
 * Proof Details route — shows requested claims after credential selection (#86).
 */
export function PresentationProofDetailsPage() {
  const navigate = useNavigate()
  const { reset } = usePresentationSession()
  const presentation = usePresentationState()

  const isReviewing = presentation.status === 'reviewing'

  useEffect(() => {
    if (!isReviewing) {
      navigate(routes.scan, { replace: true })
    }
  }, [isReviewing, navigate])

  const displayMatches = useMemo(() => {
    const matches = presentation.credential_matches ?? []
    const selected = presentation.selected_credentials ?? []

    if (selected.length === 0) {
      return matches
    }

    const selectedByQuery = new Map(
      selected.map((entry) => [entry.query_id, entry.credential_id])
    )
    return filterMatchesForSelection(matches, selectedByQuery)
  }, [presentation.credential_matches, presentation.selected_credentials])

  const handleBack = () => {
    presentation.setSelectedCredentials([])
    presentation.setStatus('selecting')
    navigate(routes.present)
  }

  const handleDecline = () => {
    reset()
    navigate(routes.home)
  }

  if (!isReviewing || !presentation.verifier || displayMatches.length === 0) {
    return null
  }

  return (
    <PresentationPageShell title="Proof Details" onBack={handleBack}>
      <ProofDetailsPage
        verifier={presentation.verifier}
        credentialMatches={displayMatches}
        onShare={() => {}}
        onDecline={handleDecline}
      />
    </PresentationPageShell>
  )
}
