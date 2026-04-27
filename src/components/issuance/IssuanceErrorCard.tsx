import illuWallet from '../../assets/illu-wallet.png'
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
        <div className="relative mb-16 h-52 w-52">
          <div className="absolute inset-0 rounded-full ring-[6px] ring-transparent" />
          <div className="absolute inset-0 animate-spin rounded-full border-[8px] border-[#99e827] border-t-transparent border-r-transparent" />
          <img
            src={illuWallet}
            alt=""
            className="absolute inset-8 m-auto h-[calc(100%-4rem)] w-[calc(100%-4rem)] object-contain"
          />
        </div>
        <div className="text-base text-slate-700">{message}</div>
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
