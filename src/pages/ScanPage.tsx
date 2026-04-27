import { BrowserQRCodeReader } from '@zxing/browser'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { PageContainer } from '../components/layout/PageContainer'
import { routes } from '../constants/routes'
import { useIssuanceSession } from '../hooks/useIssuanceSession'
import type { IssuanceApiError } from '../types/issuance'
import { issuanceUserMessage } from '../utils/issuanceErrors'
import { parseCredentialOfferInput } from '../utils/credentialOffer'
import illuWallet from '../assets/illu-wallet.png'

type ScanStatus = 'idle' | 'scanning' | 'processing' | 'done'
type FacingMode = 'environment' | 'user'

export function ScanPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle')
  const [feedbackMessage, setFeedbackMessage] = useState(
    'Point your camera at a credential offer QR code.'
  )
  const [isScannerActive, setIsScannerActive] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [facingMode, setFacingMode] = useState<FacingMode>('environment')
  const [isSwapping, setIsSwapping] = useState(false)
  const [localScanError, setLocalScanError] = useState<{
    apiError: IssuanceApiError
    userMessage: string
  } | null>(null)

  const { offerState, submitOffer, reset: resetOffer } = useIssuanceSession()

  useEffect(() => {
    if (offerState.status === 'success' && offerState.session) {
      navigate(routes.credentialTypes)
    }
  }, [offerState, navigate])

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<BrowserQRCodeReader | null>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const scanInProgressRef = useRef(false)
  const facingModeRef = useRef<FacingMode>(facingMode)

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
  }, [])

  const handleDecodedValue = useCallback(
    async (value: string) => {
      if (scanInProgressRef.current) return
      scanInProgressRef.current = true

      stopScanner()

      const parsedOffer = parseCredentialOfferInput(value)
      if (!parsedOffer) {
        const apiError: IssuanceApiError = {
          httpStatus: 400,
          error: 'invalid_credential_offer',
          error_description: null,
        }
        setLocalScanError({
          apiError,
          userMessage: issuanceUserMessage(apiError),
        })
        setScanStatus('done')
        scanInProgressRef.current = false
        return
      }

      setScanStatus('processing')
      setFeedbackMessage('Contacting issuer…')

      await submitOffer(parsedOffer.normalizedUri)

      setScanStatus('done')
      scanInProgressRef.current = false
    },
    [stopScanner, submitOffer]
  )

  useEffect(() => {
    facingModeRef.current = facingMode
  }, [facingMode])

  const startScan = useCallback(
    async (mode?: FacingMode) => {
      const selectedMode = mode ?? facingModeRef.current
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
          { video: { facingMode: { ideal: selectedMode } } },
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
    },
    [handleDecodedValue, resetOffer]
  )

  const errorReason = searchParams.get('error')

  useEffect(() => {
    let mounted = true

    if (errorReason === 'empty-options') {
      const timer = window.setTimeout(() => {
        resetOffer()
        if (!mounted) return
        setIsInitializing(false)
        setFeedbackMessage(
          'No credential options were returned for this offer. Please scan again.'
        )
        void startScan()
      }, 220)
      return () => {
        mounted = false
        window.clearTimeout(timer)
      }
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
  }, [errorReason, resetOffer, startScan])

  useEffect(() => {
    return () => {
      stopScanner()
      readerRef.current = null
    }
  }, [stopScanner])
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

  const showErrorCard =
    scanStatus === 'done' && (offerState.status === 'error' || localScanError !== null)
  const showFullscreenStatus = offerState.status === 'loading' || showErrorCard
  const showSpinner = scanStatus === 'processing' || offerState.status === 'loading'

  const handleErrorRetry = () => {
    resetOffer()
    void startScan()
  }

  const statusBarText = isInitializing
    ? '◉ Initializing scanner…'
    : `◉ ${feedbackMessage}`

  return (
    <PageContainer>
      <div className="mx-auto flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#E9ECEF]">
        {showFullscreenStatus && offerState.status === 'loading' && (
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
              <div className="text-base text-slate-700">
                Just a moment while we make a secure connection...
              </div>
            </div>
          </div>
        )}

        {showErrorCard && (
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
              <div className="text-base text-slate-700">
                {offerState.status === 'error'
                  ? offerState.rawMessage
                  : (localScanError?.userMessage ??
                    'Failed to process credential offer.')}
              </div>
              <button
                type="button"
                onClick={() => void handleErrorRetry()}
                className="mt-6 rounded-lg bg-[#99e827] px-8 py-2.5 text-base font-medium text-black shadow transition-colors hover:bg-[#66b80f] active:bg-[#5aa70d]"
              >
                Scan again
              </button>
            </div>
          </div>
        )}

        {!showFullscreenStatus && (
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
        )}

        {!showFullscreenStatus && (
          <div className="border-b border-slate-300 bg-[#e9ecef] py-1 text-center text-[15px] leading-none text-slate-700 font-serif">
            {statusBarText}
          </div>
        )}

        <section className="relative flex-1 bg-[#E9ECEF]">
          <video
            ref={videoRef}
            className={[
              'absolute inset-0 h-full w-full object-cover',
              isScannerActive ? '' : 'opacity-0',
            ].join(' ')}
            autoPlay
            muted
            playsInline
          />
          {!isScannerActive && <div className="h-full w-full bg-[#E9ECEF]" />}

          {showSpinner && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/30">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
              <p className="text-sm font-medium text-white">Contacting issuer…</p>
            </div>
          )}

          {/* Camera swap button */}
          {isScannerActive && scanStatus === 'scanning' && (
            <button
              type="button"
              onClick={() => void swapCamera()}
              disabled={isSwapping}
              className={[
                'absolute bottom-4 left-1/2 z-10 h-9 w-9 -translate-x-1/2 rounded-full bg-white text-lg text-slate-700 shadow',
                isSwapping ? 'cursor-not-allowed opacity-60' : '',
              ].join(' ')}
              title="Swap Camera"
              aria-label="Swap camera"
            >
              ↻
            </button>
          )}
        </section>
      </div>
    </PageContainer>
  )
}
