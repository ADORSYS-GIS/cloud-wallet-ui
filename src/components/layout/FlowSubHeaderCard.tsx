import type { ReactNode } from 'react'

type FlowSubHeaderCardProps = {
  children: ReactNode
}

/** Grey panel wrapping the credential summary card below the flow sub-header. */
export function FlowSubHeaderCard({ children }: FlowSubHeaderCardProps) {
  return (
    <div className="shrink-0 px-1 py-1">
      <div className="rounded-md bg-[#e7eaed] p-1.5">{children}</div>
    </div>
  )
}
