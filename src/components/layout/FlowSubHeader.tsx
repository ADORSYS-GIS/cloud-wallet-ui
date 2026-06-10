type FlowSubHeaderProps = {
  title: string
  onBack?: () => void
  backLabel?: string
}

/**
 * Gradient navigation bar used on issuance and presentation flow screens
 * (Credential Types, Credential Type Details, Shared Claims, etc.).
 */
export function FlowSubHeader({ title, onBack, backLabel = 'Back' }: FlowSubHeaderProps) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center border-b border-[#96a8b2] bg-gradient-to-r from-[#3f6f7e] to-[#4e7f8f] px-2 py-2">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="h-10 w-10 rounded-full text-3xl leading-none text-white"
          aria-label={backLabel}
        >
          ‹
        </button>
      ) : (
        <div className="w-10" />
      )}
      <div className="text-center text-[16px] font-semibold leading-none text-white md:text-[18px]">
        {title}
      </div>
      <div className="w-10" />
    </div>
  )
}
