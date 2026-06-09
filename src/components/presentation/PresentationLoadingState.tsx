import illuWallet from '../../assets/illu-wallet.png'

type PresentationLoadingStateProps = {
  message?: string
}

export function PresentationLoadingState({
  message = 'Processing proof request…',
}: PresentationLoadingStateProps) {
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
      <p className="text-base text-slate-700">{message}</p>
    </div>
  )
}
