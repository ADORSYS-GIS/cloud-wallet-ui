import { useMemo } from 'react'
import { RequestedClaimCard } from '../../components/presentation/RequestedClaimCard'
import { flattenRequestedClaims } from '../../utils/presentation/flattenRequestedClaims'
import type {
  CredentialMatch,
  TransactionDataDisplay,
  VerifierDisplay,
} from '../../types/presentation'

type TransactionDataAcknowledgment = {
  acknowledged: boolean
  onAcknowledge: () => void
}

type ProofDetailsPageProps = {
  verifier: VerifierDisplay
  credentialMatches: CredentialMatch[]
  purpose?: string | null
  transactionData?: TransactionDataDisplay[] | null
  transactionAcknowledgment?: TransactionDataAcknowledgment
  onShare: () => void
  onDecline: () => void
  isShareSubmitting?: boolean
}

function VerifierWarning({ verifier }: { verifier: VerifierDisplay }) {
  if (verifier.verified !== false) return null

  return (
    <div className="rounded-md border border-amber-400 bg-amber-50 px-4 py-3">
      <p className="text-sm font-semibold text-amber-800">Unverified verifier</p>
      <p className="mt-1 text-sm text-amber-700">
        The identity of this verifier could not be confirmed. Proceed with caution.
      </p>
      {verifier.verification_method === null && (
        <p className="mt-1 text-xs text-amber-600">
          No verification method was provided for this request.
        </p>
      )}
    </div>
  )
}

function TransactionDataPanel({
  data,
  acknowledgment,
}: {
  data: TransactionDataDisplay[]
  acknowledgment?: TransactionDataAcknowledgment
}) {
  return (
    <div className="space-y-3">
      <p className="text-[15px] font-semibold leading-snug text-slate-900">
        Transaction details
      </p>
      {data.map((entry, index) => (
        <div
          key={`${entry.type}-${index}`}
          className="rounded-md border border-slate-300/80 bg-white px-4 py-3"
        >
          <p className="text-[13px] font-medium uppercase tracking-wide text-slate-500">
            {entry.type.replace(/_/g, ' ')}
          </p>
          <div className="mt-2 space-y-1">
            {Object.entries(entry.display_data).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-sm text-slate-500">{key.replace(/_/g, ' ')}</span>
                <span className="text-sm font-medium text-slate-900">
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {acknowledgment && (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={acknowledgment.acknowledged}
            onChange={acknowledgment.onAcknowledge}
            className="h-4 w-4 rounded border-slate-300 text-[#99e827] focus:ring-[#99e827]"
          />
          <span className="text-sm text-slate-700">
            I acknowledge and confirm these transaction details.
          </span>
        </label>
      )}
    </div>
  )
}

export function ProofDetailsPage({
  verifier,
  credentialMatches,
  purpose,
  transactionData,
  transactionAcknowledgment,
  onShare,
  onDecline,
  isShareSubmitting = false,
}: ProofDetailsPageProps) {
  const claims = useMemo(
    () => flattenRequestedClaims(credentialMatches),
    [credentialMatches]
  )

  const hasUnacknowledgedTransactionData =
    Boolean(transactionData && transactionData.length > 0) &&
    (!transactionAcknowledgment || !transactionAcknowledgment.acknowledged)

  const shareDisabled = isShareSubmitting || hasUnacknowledgedTransactionData

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#e9ecef]">
      <section className="flex-1 overflow-y-auto px-4 pb-4 pt-5 space-y-4">
        <div className="text-center">
          <h2 className="text-[22px] font-bold leading-tight text-slate-900">
            Select a Claim
          </h2>
          <p className="mt-1 text-[15px] text-slate-900">to present to</p>
        </div>

        {/* Verifier info */}
        <div className="rounded-md bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            {verifier.logo_uri && (
              <img
                src={verifier.logo_uri}
                alt=""
                className="h-10 w-10 rounded-full object-contain"
              />
            )}
            <div>
              <p className="text-base font-semibold text-slate-900">{verifier.name}</p>
              {verifier.policy_uri && (
                <a
                  href={verifier.policy_uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Privacy policy
                </a>
              )}
            </div>
          </div>
        </div>

        <VerifierWarning verifier={verifier} />

        {/* Purpose */}
        {purpose && (
          <div className="rounded-md bg-white px-4 py-3 shadow-sm">
            <p className="text-[13px] font-medium uppercase tracking-wide text-slate-500">
              Purpose
            </p>
            <p className="mt-1 text-[15px] text-slate-900">{purpose}</p>
          </div>
        )}

        {/* Credential matches */}
        {credentialMatches.length > 0 && (
          <div className="space-y-3">
            <p className="text-[15px] font-semibold leading-snug text-slate-900">
              Credentials to share
            </p>
            {credentialMatches.map((match) => (
              <div
                key={match.query_id}
                className="rounded-md bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-900">
                    {match.candidates[0]?.display.name ?? match.query_id}
                  </p>
                  <span
                    className={`text-xs font-medium ${
                      match.required ? 'text-red-600' : 'text-slate-500'
                    }`}
                  >
                    {match.required ? 'Required' : 'Optional'}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  {match.candidates[0]?.display.issuer_name}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Requested claims */}
        {claims.length > 0 && (
          <div className="space-y-2">
            <p className="text-[15px] font-semibold leading-snug text-slate-900">
              Requested claims
            </p>
            {claims.map((claim) => (
              <RequestedClaimCard
                key={claim.id}
                label={claim.label}
                valuePreview={claim.valuePreview}
              />
            ))}
          </div>
        )}

        {/* Transaction data */}
        {transactionData && transactionData.length > 0 && (
          <TransactionDataPanel
            data={transactionData}
            acknowledgment={transactionAcknowledgment}
          />
        )}
      </section>

      <div className="shrink-0 space-y-2 px-4 pb-4">
        <button
          type="button"
          onClick={onShare}
          disabled={shareDisabled}
          className="h-10 w-full rounded-[4px] bg-[#99e827] text-[16px] font-normal text-slate-900 transition-colors duration-150 hover:bg-[#89d61f] active:bg-[#7dc31a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Share
        </button>
        <button
          type="button"
          onClick={onDecline}
          disabled={isShareSubmitting}
          className="h-10 w-full rounded-[4px] border border-slate-400 bg-transparent text-[16px] font-normal text-slate-900 transition-colors duration-150 hover:bg-slate-100 active:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Decline
        </button>
      </div>
    </div>
  )
}
