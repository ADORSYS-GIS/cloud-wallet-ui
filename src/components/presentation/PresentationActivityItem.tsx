import type { KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { presentationActivityDetailPath } from '../../constants/routes'
import type { PresentationActivityRecord } from '../../types/presentationActivity'
import { formatPresentationActivityListTimestamp } from '../../utils/presentationActivity'

type PresentationActivityItemProps = {
  record: PresentationActivityRecord
  onDeleteRequest: (record: PresentationActivityRecord) => void
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-5 w-5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 3h6m-8 4h10m-1 0-.8 12.4a1 1 0 0 1-1 .9H8.8a1 1 0 0 1-1-.9L7 7m3 4v5m4-5v5"
      />
    </svg>
  )
}

export function PresentationActivityItem({
  record,
  onDeleteRequest,
}: PresentationActivityItemProps) {
  const navigate = useNavigate()

  const openDetails = () => {
    navigate(presentationActivityDetailPath(record.id))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openDetails()
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={openDetails}
      onKeyDown={handleKeyDown}
      aria-label={`View shared data for Confirmed Proof Request from ${formatPresentationActivityListTimestamp(record.presented_at)}`}
      className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-colors duration-200 hover:bg-[#e6f4e6] focus:outline-none focus:ring-2 focus:ring-[#99e827]/40"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] leading-none text-slate-500">
          {formatPresentationActivityListTimestamp(record.presented_at)}
        </p>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onDeleteRequest(record)
          }}
          className="shrink-0 text-slate-500 transition-colors hover:text-red-600"
          aria-label="Delete activity"
        >
          <TrashIcon />
        </button>
      </div>

      <h2 className="mt-3 text-[15px] font-bold leading-snug text-slate-900">
        Confirmed Proof Request
      </h2>

      <p className="mt-2 break-all text-[13px] leading-relaxed text-slate-500">
        {record.verifier.client_id}
      </p>

      <div className="mt-4 flex justify-end">
        <span className="text-[14px] font-medium text-[#4b7c8c]">View shared data →</span>
      </div>
    </article>
  )
}
