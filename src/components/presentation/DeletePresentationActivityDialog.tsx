type DeletePresentationActivityDialogProps = {
  open: boolean
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

const cancelButtonClass =
  'w-full rounded-lg border border-slate-300 bg-[#f4f7f9] px-4 py-3 text-center text-[15px] font-medium text-slate-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60'

const deleteButtonClass =
  'w-full rounded-lg border border-red-700 bg-red-600 px-4 py-3 text-center text-[15px] font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60'

export function DeletePresentationActivityDialog({
  open,
  deleting,
  onCancel,
  onConfirm,
}: DeletePresentationActivityDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 font-serif"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-labelledby="delete-presentation-title"
        aria-describedby="delete-presentation-desc"
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="absolute right-4 top-4 text-2xl leading-none text-slate-700 hover:text-slate-900 disabled:opacity-50"
          aria-label="Close"
        >
          ×
        </button>

        <h2
          id="delete-presentation-title"
          className="pr-8 text-xl font-bold text-slate-900"
        >
          Confirm Deletion
        </h2>
        <p
          id="delete-presentation-desc"
          className="mt-4 text-[15px] leading-relaxed text-slate-800"
        >
          Are you sure you want to permanently delete this activity from your wallet? Once
          deleted, it cannot be recovered.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className={deleteButtonClass}
          >
            {deleting ? 'Deleting…' : 'Yes, delete activity'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className={cancelButtonClass}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
