export function PresentationActivityEmptyState() {
  return (
    <section className="flex min-h-0 flex-1 flex-col items-center justify-center bg-[#E9ECEF] px-4 pb-8">
      <div className="flex w-full max-w-3xl flex-col items-center gap-6">
        <p className="text-center text-slate-900">There is no past activity to show.</p>
        <p className="max-w-[830px] text-center leading-snug text-slate-900">
          Present credentials to see past activities history.
        </p>
      </div>
    </section>
  )
}
