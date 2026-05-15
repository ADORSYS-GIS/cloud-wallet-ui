import { useState, type ReactNode } from 'react'

type RemoveCredentialAccordionProps = {
  title: string
  children: ReactNode
  defaultExpanded?: boolean
  /** Adds a top border — use on every section after the first for the stacked double-line look. */
  showTopBorder?: boolean
}

export function RemoveCredentialAccordion({
  title,
  children,
  defaultExpanded = false,
  showTopBorder = false,
}: RemoveCredentialAccordionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <section
      className={[
        'border-b border-slate-400/90',
        showTopBorder ? 'border-t border-slate-400/90' : '',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between bg-[#E9ECEF] px-4 py-4 text-left"
        aria-expanded={expanded}
      >
        <span className="text-[15px] font-bold text-slate-900">{title}</span>
        <span className="text-base leading-none text-slate-700" aria-hidden>
          {expanded ? '⌃' : '⌄'}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-slate-300/90 bg-white px-4 py-4 shadow-[0_4px_8px_rgba(0,0,0,0.16)]">
          {children}
        </div>
      )}
    </section>
  )
}
