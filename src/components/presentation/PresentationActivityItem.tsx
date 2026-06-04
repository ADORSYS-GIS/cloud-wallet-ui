import { useNavigate } from 'react-router-dom'
import { IssuerAvatar } from '../issuance/IssuerAvater'
import { presentationActivityDetailPath } from '../../constants/routes'
import type { PresentationActivityRecord } from '../../types/presentationActivity'
import {
  formatPresentationTimestamp,
  verifierDisplayLabel,
} from '../../utils/presentationActivity'

type PresentationActivityItemProps = {
  record: PresentationActivityRecord
  onDeleteRequest: (record: PresentationActivityRecord) => void
}

export function PresentationActivityItem({
  record,
  onDeleteRequest,
}: PresentationActivityItemProps) {
  const navigate = useNavigate()
  const verifierLabel = verifierDisplayLabel(record.verifier)
  const credentialSummary =
    record.credential_types.length === 0
      ? 'No credential types recorded'
      : record.credential_types.join(', ')

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <button
        type="button"
        onClick={() => navigate(presentationActivityDetailPath(record.id))}
        className="w-full text-left transition-all duration-200 hover:opacity-95"
      >
        <div className="flex items-start gap-3">
          <IssuerAvatar
            displayName={verifierLabel}
            logoUri={record.verifier.logo_uri ?? null}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-slate-900">
              {verifierLabel}
            </p>
            <p className="mt-0.5 truncate text-[13px] text-slate-500">
              {record.verifier.client_id}
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-700">
              {credentialSummary}
            </p>
            <p className="mt-1 text-[13px] text-slate-500">
              {record.disclosed_claim_count} claim
              {record.disclosed_claim_count === 1 ? '' : 's'} shared (values not stored)
            </p>
            <p className="mt-2 text-[13px] font-medium text-[#4b7c8c]">
              {formatPresentationTimestamp(record.presented_at)}
            </p>
          </div>
        </div>
      </button>
      <div className="mt-3 flex justify-end gap-4 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => navigate(presentationActivityDetailPath(record.id))}
          className="text-[14px] font-medium text-[#4b7c8c] hover:underline"
        >
          Details
        </button>
        <button
          type="button"
          onClick={() => onDeleteRequest(record)}
          className="text-[14px] font-medium text-red-600 hover:underline"
        >
          Delete
        </button>
      </div>
    </article>
  )
}
