type DeletePresentationActivityDialogProps = {
  open: boolean
  verifierLabel: string
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeletePresentationActivityDialog({
  open,
  verifierLabel,
  deleting,
  onCancel,
  onConfirm,
}: DeletePresentationActivityDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-labelledby="delete-presentation-title"
        aria-describedby="delete-presentation-desc"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
      >
        <h2
          id="delete-presentation-title"
          className="text-lg font-semibold text-slate-900"
        >
          Delete this activity?
        </h2>
        <p
          id="delete-presentation-desc"
          className="mt-3 text-[15px] leading-relaxed text-slate-600"
        >
          This permanently removes the presentation record for{' '}
          <span className="font-medium text-slate-800">{verifierLabel}</span> from your
          wallet history. Claim values were never stored; only this summary metadata will
          be deleted.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-md border border-slate-300 px-4 py-2.5 text-[15px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-md bg-red-600 px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
