import type { PresentationActivityFilters as Filters } from '../../hooks/usePresentationActivity'

type PresentationActivityFiltersProps = {
  filters: Filters
  onChange: (next: Filters) => void
  disabled?: boolean
}

export function PresentationActivityFilters({
  filters,
  onChange,
  disabled = false,
}: PresentationActivityFiltersProps) {
  return (
    <section
      className="shrink-0 border-b border-slate-200 bg-white px-4 py-3"
      aria-label="Filter presentation activity"
    >
      <div className="grid gap-3">
        <label className="block">
          <span className="text-[13px] font-medium text-slate-600">Search verifier</span>
          <input
            type="search"
            value={filters.verifierName}
            disabled={disabled}
            onChange={(e) => onChange({ ...filters, verifierName: e.target.value })}
            placeholder="Verifier name"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-[#4b7c8c] focus:outline-none focus:ring-2 focus:ring-[#4b7c8c]/30 disabled:bg-slate-100"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[13px] font-medium text-slate-600">From</span>
            <input
              type="date"
              value={filters.from}
              disabled={disabled}
              onChange={(e) => onChange({ ...filters, from: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-[15px] text-slate-900 focus:border-[#4b7c8c] focus:outline-none focus:ring-2 focus:ring-[#4b7c8c]/30 disabled:bg-slate-100"
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium text-slate-600">To</span>
            <input
              type="date"
              value={filters.to}
              disabled={disabled}
              onChange={(e) => onChange({ ...filters, to: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-[15px] text-slate-900 focus:border-[#4b7c8c] focus:outline-none focus:ring-2 focus:ring-[#4b7c8c]/30 disabled:bg-slate-100"
            />
          </label>
        </div>
      </div>
    </section>
  )
}
