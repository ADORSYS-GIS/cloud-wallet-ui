type DeletePresentationActivityDialogProps = {
  open: boolean
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

const actionButtonClass =
  'w-full rounded-[10px] border border-[#b0bec5] bg-[#f7f9fa] py-2 text-center font-serif text-[15px] font-normal leading-tight text-slate-900 transition-colors hover:bg-[#eef1f3] active:bg-[#e8ecef] disabled:cursor-not-allowed disabled:opacity-60'

export function DeletePresentationActivityDialog({
  open,
  deleting,
  onCancel,
  onConfirm,
}: DeletePresentationActivityDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 font-serif"
      role="presentation"
      onClick={onCancel}
    >
      {/* Match activity list width: PageContainer max-w-[810px] + list px-4 */}
      <div
        className="mx-auto w-full max-w-[810px] px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          role="alertdialog"
          aria-labelledby="delete-presentation-title"
          aria-describedby="delete-presentation-desc"
          className="ml-[0.5%] mr-[2.5%] w-[97%] min-w-0 max-w-[97%] rounded-[10px] border border-slate-300 bg-white px-2 py-5"
        >
          <div className="relative pr-7">
            <h2
              id="delete-presentation-title"
              className="text-[18px] font-semibold leading-snug text-slate-900"
            >
              Confirm Deletion
            </h2>
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="absolute right-0 top-0 font-serif text-[20px] font-normal leading-none text-slate-800 hover:text-slate-950 disabled:opacity-50"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <p
            id="delete-presentation-desc"
            className="mt-3 text-[15px] font-normal leading-snug text-slate-900 min-[768px]:whitespace-nowrap"
          >
            Are you sure you want to permanently delete this activity from your wallet?
            Once deleted, it cannot be recovered.
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className={actionButtonClass}
            >
              {deleting ? 'Deleting…' : 'Yes, delete activity'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className={actionButtonClass}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
