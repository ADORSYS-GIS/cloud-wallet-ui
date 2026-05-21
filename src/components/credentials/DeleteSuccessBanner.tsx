import { useEffect, useState } from 'react'
import checkCirclePrimary from '../../assets/check-circle-primary.png'

type DeleteSuccessBannerProps = {
  credentialName: string
  onDismiss: () => void
}

export function DeleteSuccessBanner({ credentialName, onDismiss }: DeleteSuccessBannerProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation after mount
    const showTimer = setTimeout(() => setIsVisible(true), 10)
    // Auto dismiss after 5 seconds
    const dismissTimer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onDismiss, 300) // Wait for animation to complete
    }, 5000)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(dismissTimer)
    }
  }, [onDismiss])

  return (
    <div
      className={[
        'fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between',
        'rounded-lg bg-[#00d1b2] px-4 py-3 text-white shadow-lg',
        'transition-all duration-300 ease-out',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
      ].join(' ')}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <img
          src={checkCirclePrimary}
          alt=""
          className="h-5 w-5 shrink-0 object-contain"
          aria-hidden="true"
        />
        <span className="text-sm font-medium">
          Credential of type {credentialName} deleted successfully.
        </span>
      </div>
      <button
        type="button"
        onClick={() => {
          setIsVisible(false)
          setTimeout(onDismiss, 300)
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Dismiss"
      >
        <span className="text-lg leading-none">×</span>
      </button>
    </div>
  )
}
