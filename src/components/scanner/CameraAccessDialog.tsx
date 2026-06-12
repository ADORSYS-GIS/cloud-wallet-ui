import illuWallet from '../../assets/illu-wallet.png'

export type CameraAccessIssue = 'denied' | 'unavailable'

type CameraAccessDialogProps = {
  issue: CameraAccessIssue
  message?: string
  onRetry: () => void
  onGoHome: () => void
}

const deniedMessage =
  'Camera permission was denied. To scan QR codes, open your browser site settings and allow camera access, then try again.'

const unavailableMessage =
  'No camera is available on this device, or your browser cannot access it. Check your device and browser settings, then try again.'

export function CameraAccessDialog({
  issue,
  message,
  onRetry,
  onGoHome,
}: CameraAccessDialogProps) {
  const bodyMessage = message ?? (issue === 'denied' ? deniedMessage : unavailableMessage)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="flex max-w-md flex-col items-center px-6 text-center">
        <div className="relative mb-12 h-52 w-52">
          <div className="absolute inset-0 rounded-full ring-[6px] ring-transparent" />
          <div className="absolute inset-0 animate-spin rounded-full border-[8px] border-[#99e827] border-t-transparent border-r-transparent" />
          <img
            src={illuWallet}
            alt=""
            className="absolute inset-8 m-auto h-[calc(100%-4rem)] w-[calc(100%-4rem)] object-contain"
          />
        </div>
        <p className="whitespace-pre-line text-base text-slate-700">{bodyMessage}</p>
        {issue === 'denied' && (
          <ol className="mt-4 list-decimal space-y-1 text-left text-sm text-slate-600">
            <li>Open site settings from your browser address bar.</li>
            <li>Allow camera access for this site.</li>
            <li>Return here and tap Try again.</li>
          </ol>
        )}
        <div className="mt-6 flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-[#99e827] px-8 py-2.5 text-base font-medium text-black shadow transition-colors hover:bg-[#66b80f] active:bg-[#5aa70d]"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={onGoHome}
            className="rounded-lg bg-slate-200 px-8 py-2.5 text-base font-medium text-slate-800 transition-colors hover:bg-slate-300 active:bg-slate-400"
          >
            Go back home
          </button>
        </div>
      </div>
    </div>
  )
}
