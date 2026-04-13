import { BrowserQRCodeReader } from '@zxing/browser'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CredentialOfferCard } from '../components/issuance/CredentailOfferCard'
import { IssuanceErrorCard } from '../components/issuance/IssuanceErrorCard'
import { Header } from '../components/Header'
import { PageContainer } from '../components/layout/PageContainer'
import { routes } from '../constants/routes'
import { useIssuanceSession } from '../hooks/useIssuanceSession'
import { parseCredentialOfferInput } from '../utils/credentialOffer'

type ScanStatus = 'idle' | 'scanning' | 'processing' | 'done'
type FacingMode = 'environment' | 'user'

export function ScanPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Camera / scanner state
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle')
  const [feedbackMessage, setFeedbackMessage] = useState(
    'Point your camera at a credential offer QR code.'
  )
  const [isScannerActive, setIsScannerActive] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [facingMode, setFacingMode] = useState<FacingMode>('environment')
  const [isSwapping, setIsSwapping] = useState(false)

  // Issuance offer state machine
  const { offerState, submitOffer, reset: resetOffer } = useIssuanceSession()

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<BrowserQRCodeReader | null>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const scanInProgressRef = useRef(false)

  // ---------------------------------------------------------------------------
  // Scanner helpers
  // ---------------------------------------------------------------------------

  const stopScanner = () => {
    controlsRef.current?.stop()
    controlsRef.current = null
  }

  const handleDecodedValue = async (value: string) => {
    if (scanInProgressRef.current) return
    scanInProgressRef.current = true

    stopScanner()

    const parsedOffer = parseCredentialOfferInput(value)
    if (!parsedOffer) {
      setScanStatus('idle')
      setFeedbackMessage(
        'Invalid credential offer QR content. Please scan a valid OpenID4VCI offer.'
      )
      scanInProgressRef.current = false
      return
    }

    setScanStatus('processing')
    setFeedbackMessage('Contacting issuer…')

    await submitOffer(parsedOffer.normalizedUri)

    setScanStatus('done')
    scanInProgressRef.current = false
  }

  const startScan = async (mode: FacingMode = facingMode) => {
    setIsScannerActive(true)
    resetOffer()
    setScanStatus('idle')
    setFeedbackMessage('Requesting camera permission…')

    if (!navigator?.mediaDevices?.getUserMedia) {
      setIsScannerActive(false)
      setScanStatus('idle')
      setFeedbackMessage('No camera device is available on this browser.')
      return
    }

    if (!videoRef.current) {
      setIsScannerActive(false)
      setScanStatus('idle')
      setFeedbackMessage('Video preview unavailable. Please reload and try again.')
      return
    }

    setScanStatus('scanning')
    setFeedbackMessage('Searching for QR code…')

    try {
      readerRef.current = new BrowserQRCodeReader()
      controlsRef.current = await readerRef.current.decodeFromConstraints(
        { video: { facingMode: { ideal: mode } } },
        videoRef.current,
        (result) => {
          if (result) {
            void handleDecodedValue(result.getText().trim())
          }
        }
      )
    } catch (error: unknown) {
      setIsScannerActive(false)
      setScanStatus('idle')
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setFeedbackMessage(
          'Camera permission denied. Please allow camera access and retry.'
        )
        return
      }
      setFeedbackMessage('Unable to start QR scanner. Check camera availability.')
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let mounted = true
    const isFreshScan = searchParams.get('fresh') === 'true'
    if (isFreshScan) {
      navigate(routes.scan, { replace: true })
    }

    const timer = window.setTimeout(() => {
      if (!mounted) return
      setIsInitializing(false)
      void startScan()
    }, 220)

    return () => {
      mounted = false
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      stopScanner()
      readerRef.current = null
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Camera swap
  // ---------------------------------------------------------------------------

  const swapCamera = async () => {
    if (isSwapping) return
    setIsSwapping(true)
    const nextMode: FacingMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextMode)
    stopScanner()
    try {
      await startScan(nextMode)
    } finally {
      setIsSwapping(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Overlay visibility
  // ---------------------------------------------------------------------------

  const showOfferCard = scanStatus === 'done' && offerState.status === 'success'
  const showErrorCard = scanStatus === 'done' && offerState.status === 'error'
  const showSpinner = scanStatus === 'processing' || offerState.status === 'loading'

  // ---------------------------------------------------------------------------
  // Handlers from offer card
  // ---------------------------------------------------------------------------

  const handleAccept = () => {
    // Consent & next steps are handled in a future ticket.
    // For now we navigate to credentials as a placeholder.
    navigate(routes.credentials)
  }

  const handleDecline = () => {
    resetOffer()
    void startScan()
  }

  const handleErrorRetry = () => {
    resetOffer()
    void startScan()
  }

  const handleErrorBack = () => {
    navigate(routes.home)
  }

  // ---------------------------------------------------------------------------
  // Feedback bar text
  // ---------------------------------------------------------------------------

  const statusBarText = isInitializing
    ? '◉ Initializing scanner…'
    : `◉ ${feedbackMessage}`

  return (
    <PageContainer>
      <div className="mx-auto flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#E9ECEF]">
        <Header showMainHeader={false} />

        {/* Sub-header / nav bar */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center border-b border-[#96a8b2] bg-gradient-to-r from-[#3f6f7e] to-[#4e7f8f] px-2 py-2">
          <button
            type="button"
            onClick={() => navigate(routes.home)}
            className="h-7 w-7 rounded-full text-xl leading-none text-white"
            aria-label="Back"
          >
            ‹
          </button>
          <div />
          <div className="w-7" />
        </div>

        {/* Status bar */}
        <div className="border-b border-slate-300 bg-[#e9ecef] py-1 text-center text-[15px] leading-none text-slate-700">
          {statusBarText}
        </div>

        {/* Camera + overlays */}
        <section className="relative flex-1 bg-[#E9ECEF]">
          {/* Video element — always in DOM so the ref is stable */}
          <video
            ref={videoRef}
            className={[
              'absolute inset-0 h-full w-full object-cover',
              isScannerActive && !showOfferCard && !showErrorCard ? '' : 'opacity-0',
            ].join(' ')}
            autoPlay
            muted
            playsInline
          />

          {!isScannerActive && <div className="h-full w-full bg-[#E9ECEF]" />}

          {/* ----------------------------------------------------------------
              Processing spinner — shown while waiting for API response
          ---------------------------------------------------------------- */}
          {showSpinner && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/30">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
              <p className="text-sm font-medium text-white">Contacting issuer…</p>
            </div>
          )}

          {/* ----------------------------------------------------------------
              Credential offer card — success state
          ---------------------------------------------------------------- */}
          {showOfferCard && offerState.status === 'success' && (
            <CredentialOfferCard
              session={offerState.session}
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
          )}

          {/* ----------------------------------------------------------------
              Error card — fallback error UI
          ---------------------------------------------------------------- */}
          {showErrorCard && offerState.status === 'error' && (
            <IssuanceErrorCard
              apiError={offerState.apiError}
              userMessage={offerState.rawMessage}
              onRetry={handleErrorRetry}
              onBack={handleErrorBack}
            />
          )}

          {/* ----------------------------------------------------------------
              Camera swap button
          ---------------------------------------------------------------- */}
          {isScannerActive && scanStatus === 'scanning' && (
            <button
              type="button"
              onClick={() => void swapCamera()}
              disabled={isSwapping}
              className={[
                'absolute bottom-4 left-1/2 z-10 h-9 w-9 -translate-x-1/2 rounded-full bg-white text-lg text-slate-700 shadow',
                isSwapping ? 'cursor-not-allowed opacity-60' : '',
              ].join(' ')}
              aria-label="Swap camera"
            >
              ↻
            </button>
          )}

          {/* ----------------------------------------------------------------
              Invalid QR retry — inline feedback when QR is malformed
          ---------------------------------------------------------------- */}
          {scanStatus === 'idle' &&
            feedbackMessage.startsWith('Invalid') &&
            !showErrorCard && (
              <button
                type="button"
                onClick={() => void startScan()}
                className="absolute bottom-4 right-4 z-10 rounded-lg bg-white px-3 py-2 text-sm text-slate-700 shadow"
              >
                Retry scan
              </button>
            )}
        </section>
      </div>
    </PageContainer>
  )
}
