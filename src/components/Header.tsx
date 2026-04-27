import type { ReactNode } from 'react'
import { useState } from 'react'
import { usePWA } from '../hooks/usePWA'

const DEFAULT_TITLE = 'DATEV Cloud Wallet'

type HeaderProps = {
  showMainHeader?: boolean
  hidePwaBanner?: boolean
  title?: string
  leftSlot?: ReactNode
}

export function Header({
  showMainHeader = true,
  hidePwaBanner = false,
  title = DEFAULT_TITLE,
  leftSlot,
}: HeaderProps) {
  const { installApp, isInstallable, isInstalling, isInstalled, isIosInstallable } =
    usePWA()
  const [showIosInstructions, setShowIosInstructions] = useState(false)
  const [showInstallUnavailableHint, setShowInstallUnavailableHint] = useState(false)

  const installButtonLabel = isInstalling ? 'Installing...' : 'Install'

  const handleInstallClick = () => {
    setShowInstallUnavailableHint(false)

    if (isInstallable) {
      void installApp()
      return
    }

    if (isIosInstallable) {
      setShowIosInstructions((prev) => !prev)
      return
    }

    setShowInstallUnavailableHint(true)
  }

  return (
    <>
      {!hidePwaBanner && (
        <div className="flex items-center justify-between bg-[#499c9d] px-4 py-2 text-black">
          <span>To access the app from your phone, install now</span>
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={isInstalling || isInstalled}
            className="rounded-lg bg-[#99e827] px-24 py-1 text-black disabled:cursor-not-allowed disabled:opacity-70"
            aria-label="Install app"
          >
            {isInstalled ? 'Installed' : installButtonLabel}
          </button>
        </div>
      )}
      {isIosInstallable && showIosInstructions && (
        <div className="bg-[#3f6f7e] px-4 py-2 text-sm text-slate-100">
          To install on iOS: tap Share, then choose Add to Home Screen.
        </div>
      )}
      {showInstallUnavailableHint && (
        <div className="bg-[#3f6f7e] px-4 py-2 text-sm text-slate-100">
          Install prompt is unavailable right now. This is expected if the app is already
          installed on this device/browser profile.
        </div>
      )}

      {showMainHeader && (
        <header className="grid grid-cols-[auto_1fr_auto] items-center gap-2 bg-[#4b7c8c] px-4 py-6">
          <div className="flex w-8 shrink-0 justify-start">
            {leftSlot ?? <span className="inline-block w-6" aria-hidden />}
          </div>
          <h1 className="min-w-0 truncate text-center font-semibold leading-none text-slate-100 md:text-[28px]">
            {title}
          </h1>
        </header>
      )}
    </>
  )
}
