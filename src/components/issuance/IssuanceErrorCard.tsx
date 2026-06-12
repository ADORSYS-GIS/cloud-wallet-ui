import illuWallet from '../../assets/illu-wallet.png'
import xCirclePrimary from '../../assets/x-circle-primary.png'
import type { IssuanceApiError } from '../../types/issuance'
import { issuanceUserMessage } from '../../utils/issuanceErrors'

type IssuanceErrorCardProps = {
  error: IssuanceApiError | null
  rawMessage?: string
  onRetry: () => void
}

export function IssuanceErrorCard({
  error,
  rawMessage,
  onRetry,
}: IssuanceErrorCardProps) {
  const message =
    rawMessage ?? (error ? issuanceUserMessage(error) : 'An unknown error occurred.')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center px-6 text-center">
        <div className="mb-16 flex flex-col items-center">
          <img src={xCirclePrimary} alt="" className="h-10 w-10 object-contain" />
          <div className="h-4" />
          <img
            src={illuWallet}
            alt=""
            className="h-[132px] w-[122px] object-contain image-optimize-contrast"
          />
        </div>
        <div className="whitespace-pre-line text-base text-slate-700">{message}</div>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-lg bg-[#99e827] px-8 py-2.5 text-base font-medium text-black shadow transition-colors hover:bg-[#66b80f] active:bg-[#5aa70d]"
        >
          Scan again
        </button>
      </div>
    </div>
  )
}
