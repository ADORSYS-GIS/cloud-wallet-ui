import { useMemo } from 'react'
import { RequestedCredentialsSection } from '../../components/presentation/RequestedCredentialsSection'
import { VerifierDetails } from '../../components/presentation/VerifierDetails'
import { verifierDisplayName } from '../../utils/presentation/verifierDisplay'
import type {
  ParsedPresentationRequest,
  VerifierMetadata,
} from '../../types/presentation'
import {
  buildCredentialSetGroupDisplays,
  buildRequestedCredentialDisplays,
  detectSecurityWarnings,
  humanizeScopeLabel,
} from '../../utils/presentation/dcqlDisplay'

type ProofDetailsPageProps = {
  request: ParsedPresentationRequest
  verifier: VerifierMetadata
  onShare: () => void
  onDecline: () => void
  isSubmitting?: boolean
}

/**
 * Pre-consent screen showing verifier information and requested credentials/claims.
 * Layout mirrors Figma "Proof Details" (issue #86).
 */
export function ProofDetailsPage({
  request,
  verifier,
  onShare,
  onDecline,
  isSubmitting = false,
}: ProofDetailsPageProps) {
  const verifierName = verifierDisplayName(verifier)

  const credentials = useMemo(
    () =>
      request.dcql_query ? buildRequestedCredentialDisplays(request.dcql_query) : [],
    [request.dcql_query]
  )

  const credentialSetGroups = useMemo(
    () => (request.dcql_query ? buildCredentialSetGroupDisplays(request.dcql_query) : []),
    [request.dcql_query]
  )

  const securityWarnings = useMemo(
    () => (request.dcql_query ? detectSecurityWarnings(request.dcql_query) : []),
    [request.dcql_query]
  )

  const scopeLabel = request.scope ? humanizeScopeLabel(request.scope) : undefined

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#e9ecef]">
      <section className="flex-1 overflow-y-auto px-4 pb-4 pt-5">
        <div className="text-center">
          <h2 className="text-[22px] font-bold leading-tight text-slate-900">
            Select a Claim
          </h2>
          <p className="mt-1 text-[15px] text-slate-900">to present to</p>
        </div>

        <div className="mt-6 space-y-4">
          <p className="text-[15px] font-semibold leading-snug text-slate-900">
            <span className="text-slate-900">{verifierName}</span> is requesting the
            following credentials:
          </p>

          <RequestedCredentialsSection
            credentials={credentials}
            credentialSetGroups={credentialSetGroups}
            securityWarnings={securityWarnings}
            scopeLabel={scopeLabel}
          />

          <VerifierDetails verifier={verifier} />
        </div>
      </section>

      <div className="shrink-0 space-y-2 px-4 pb-4">
        <button
          type="button"
          onClick={onShare}
          disabled={isSubmitting}
          className="h-10 w-full rounded-[4px] bg-[#99e827] text-[16px] font-normal text-slate-900 transition-colors duration-150 hover:bg-[#89d61f] active:bg-[#7dc31a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Share
        </button>
        <button
          type="button"
          onClick={onDecline}
          disabled={isSubmitting}
          className="h-10 w-full rounded-[4px] border border-slate-400 bg-transparent text-[16px] font-normal text-slate-900 transition-colors duration-150 hover:bg-slate-100 active:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Decline
        </button>
      </div>
    </div>
  )
}
