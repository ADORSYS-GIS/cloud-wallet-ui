import illuWallet from '../../assets/illu-wallet.png'

type WalletLoadingOverlayProps = {
  message?: string
}

export function WalletLoadingOverlay({ message }: WalletLoadingOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
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
        {message ? <div className="mt-2 text-sm text-slate-500">{message}</div> : null}
      </div>
    </div>
  )
}
