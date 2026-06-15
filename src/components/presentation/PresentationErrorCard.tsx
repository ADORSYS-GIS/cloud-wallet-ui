import illuWalletError from '../../assets/illu-wallet-error.png'
import type { PresentationError } from '../../types/presentation'
import { presentationUserMessage } from '../../utils/presentation/presentationErrors'

type PresentationErrorCardProps = {
  error: PresentationError
  onRetry?: () => void
  retryLabel?: string
}

export function PresentationErrorCard({
  error,
  onRetry,
  retryLabel = 'Try again',
}: PresentationErrorCardProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-12 flex flex-col items-center">
        <img
          src={illuWalletError}
          alt=""
          className="h-[132px] w-[122px] object-contain image-optimize-contrast"
        />
      </div>
      <p className="max-w-md whitespace-pre-line text-base text-slate-700">
        {presentationUserMessage(error)}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-lg bg-[#99e827] px-8 py-2.5 text-base font-medium text-black shadow transition-colors hover:bg-[#66b80f] active:bg-[#5aa70d]"
        >
          {retryLabel}
        </button>
      )}
    </div>
  )
}
