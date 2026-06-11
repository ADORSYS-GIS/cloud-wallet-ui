type RequestedClaimCardProps = {
  label: string
  valuePreview?: string
}

/**
 * Single requested claim card — matches Figma proof-details (label + bold value).
 */
export function RequestedClaimCard({ label, valuePreview }: RequestedClaimCardProps) {
  return (
    <div className="rounded-md border border-slate-300/80 bg-[#efefef] px-4 py-3">
      <p className="text-[13px] leading-tight text-slate-700">{label}</p>
      {valuePreview && (
        <p className="mt-1 text-[15px] font-semibold leading-tight text-slate-900">
          {valuePreview}
        </p>
      )}
    </div>
  )
}
