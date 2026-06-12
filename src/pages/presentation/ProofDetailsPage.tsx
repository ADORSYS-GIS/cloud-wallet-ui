import { useMemo } from 'react'
import { RequestedClaimCard } from '../../components/presentation/RequestedClaimCard'
import { flattenRequestedClaims } from '../../utils/presentation/flattenRequestedClaims'
import type { CredentialMatch, VerifierDisplay } from '../../types/presentation'

type ProofDetailsPageProps = {
  verifier: VerifierDisplay
  credentialMatches: CredentialMatch[]
  onShare: () => void
  onDecline: () => void
  isSubmitting?: boolean
}

/**
 * Pre-consent Proof Details screen (issue #86).
 * Figma happy path: claims list + Share / Decline.
 * Data source: POST /presentation/start → credential_matches.
 */
export function ProofDetailsPage({
  verifier,
  credentialMatches,
  onShare,
  onDecline,
  isSubmitting = false,
}: ProofDetailsPageProps) {
  const claims = useMemo(
    () => flattenRequestedClaims(credentialMatches),
    [credentialMatches]
  )

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
            <span>{verifier.name}</span> is requesting the following credentials:
          </p>

          {claims.length > 0 && (
            <div className="space-y-2">
              {claims.map((claim) => (
                <RequestedClaimCard
                  key={claim.id}
                  label={claim.label}
                  valuePreview={claim.valuePreview}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="shrink-0 space-y-2 px-4 pb-4">
        <button
          type="button"
          onClick={onShare}
          disabled={isSubmitting}
          className="h-10 w-full rounded-[4px] bg-[#99e827] text-[16px] font-normal text-slate-900 transition-colors duration-150 hover:bg-[#89d61f] active:bg-[#7dc31a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Sharing…' : 'Share'}
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
