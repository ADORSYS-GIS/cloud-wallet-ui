import illuWallet from '../../assets/illu-wallet.png'
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
      <div className="relative mb-12 h-52 w-52">
        <div className="absolute inset-0 rounded-full ring-[6px] ring-transparent" />
        <div className="absolute inset-0 animate-spin rounded-full border-[8px] border-[#99e827] border-t-transparent border-r-transparent" />
        <img
          src={illuWallet}
          alt=""
          className="absolute inset-8 m-auto h-[calc(100%-4rem)] w-[calc(100%-4rem)] object-contain"
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
