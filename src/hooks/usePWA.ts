import { useEffect, useMemo, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isIosDevice(): boolean {
  const ua = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(ua)
}

function isStandaloneMode(): boolean {
  const standaloneMedia = window.matchMedia('(display-mode: standalone)').matches
  const minimalUiMedia = window.matchMedia('(display-mode: minimal-ui)').matches
  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone
  )
  return standaloneMedia || minimalUiMedia || iosStandalone
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    null
  )
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    setIsInstalled(isStandaloneMode())

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const onAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstalled(true)
      setIsInstalling(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const installApp = async () => {
    if (!deferredPrompt) {
      return
    }

    setIsInstalling(true)
    try {
      await deferredPrompt.prompt()
      await deferredPrompt.userChoice
    } finally {
      setDeferredPrompt(null)
      setIsInstalling(false)
    }
  }

  const isIosInstallable = useMemo(() => isIosDevice() && !isInstalled, [isInstalled])
  const isInstallable = useMemo(
    () => Boolean(deferredPrompt) && !isInstalling && !isInstalled,
    [deferredPrompt, isInstalled, isInstalling]
  )

  return {
    installApp,
    isInstallable,
    isInstalling,
    isInstalled,
    isIosInstallable,
  }
}
