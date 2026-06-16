import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { WalletLoadingOverlay } from '../../components/feedback/WalletLoadingOverlay'
import { PresentationPageShell } from '../../components/presentation/PresentationPageShell'
import { routes } from '../../constants/routes'
import { usePresentationSubmission } from '../../hooks/presentation/usePresentationSubmission'
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

export function PresentationProofDetailsPage() {
  const navigate = useNavigate()
  const presentation = usePresentationState()
  const { isSharing, submitConsent } = usePresentationSubmission()

  const presentationStatus = presentation.status
  const isOnProofDetails =
    presentationStatus === 'reviewing' || presentationStatus === 'submitting'

  useEffect(() => {
    if (
      presentationStatus === 'idle' ||
      presentationStatus === 'success' ||
      presentationStatus === 'rejected' ||
      presentationStatus === 'error'
    ) {
      return
    }
    if (!isOnProofDetails) {
      navigate(routes.scan, { replace: true })
    }
  }, [isOnProofDetails, navigate, presentationStatus])

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

  const hasTransactionData = Boolean(
    presentation.transaction_data && presentation.transaction_data.length > 0
  )

  const handleBack = () => {
    if (isSharing) return
    presentation.setSelectedCredentials([])
    presentation.setStatus('selecting')
    navigate(routes.present)
  }

  const handleShare = useCallback(() => {
    const sessionId = presentation.session_id
    if (!sessionId) return

    void submitConsent({
      sessionId,
      accepted: true,
      selectedCredentials: presentation.selected_credentials ?? [],
      transactionDataAcknowledged: hasTransactionData ? true : undefined,
    })
  }, [
    hasTransactionData,
    presentation.selected_credentials,
    presentation.session_id,
    submitConsent,
  ])

  const handleDecline = useCallback(() => {
    const sessionId = presentation.session_id
    if (!sessionId) return

    void submitConsent({
      sessionId,
      accepted: false,
    })
  }, [presentation.session_id, submitConsent])

  if (!isOnProofDetails || !presentation.verifier || displayMatches.length === 0) {
    return null
  }

  return (
    <>
      {isSharing && <WalletLoadingOverlay message="Sharing…" />}
      <PresentationPageShell title="Proof Details" onBack={handleBack}>
        <ProofDetailsPage
          verifier={presentation.verifier}
          credentialMatches={displayMatches}
          onShare={handleShare}
          onDecline={handleDecline}
          isShareSubmitting={isSharing}
        />
      </PresentationPageShell>
    </>
  )
}
