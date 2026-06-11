import { BrowserQRCodeReader } from '@zxing/browser'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { PageContainer } from '../components/layout/PageContainer'
import { IssuanceErrorCard } from '../components/issuance/IssuanceErrorCard'
import { PresentationErrorCard } from '../components/presentation/PresentationErrorCard'
import { credentialTypeDetailsPath, routes } from '../constants/routes'
import { usePresentationSession } from '../hooks/presentation/usePresentationSession'
import { useIssuanceSession } from '../hooks/useIssuanceSession'
import type { IssuanceApiError } from '../types/issuance'
import type { PresentationError } from '../types/presentation'
import { issuanceUserMessage } from '../utils/issuanceErrors'
import { parseCredentialOfferInput } from '../utils/credentialOffer'
import { detectRequestType } from '../utils/presentation/detectRequestType'
import { parsePresentationScanInput } from '../utils/presentation/presentationScanInput'
import { presentationUserMessage } from '../utils/presentation/presentationErrors'
import illuWallet from '../assets/illu-wallet.png'
import { E2E_SCAN_SAMPLE_OFFER } from '../e2e/scan-sample-offer'

type ScanStatus = 'idle' | 'scanning' | 'processing' | 'done'
type FacingMode = 'environment' | 'user'

export function ScanPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle')
  const [feedbackMessage, setFeedbackMessage] = useState(
    'Point your camera at a credential offer or presentation request QR code.'
  )
  const [isScannerActive, setIsScannerActive] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [facingMode, setFacingMode] = useState<FacingMode>('environment')
  const [isSwapping, setIsSwapping] = useState(false)
  const [localIssuanceError, setLocalIssuanceError] = useState<{
    apiError: IssuanceApiError
    userMessage: string
  } | null>(null)
  const [localPresentationError, setLocalPresentationError] =
    useState<PresentationError | null>(null)
  const [processingRequestType, setProcessingRequestType] = useState<
    'issuance' | 'presentation' | null
  >(null)

  const { offerState, submitOffer, reset: resetOffer } = useIssuanceSession()
  const {
    sessionState: presentationSession,
    startRequest: startPresentationRequest,
    reset: resetPresentation,
  } = usePresentationSession()

  useEffect(() => {
    if (offerState.status === 'success' && offerState.session) {
      const { credential_types } = offerState.session
      if (credential_types.length === 1) {
        navigate(
          credentialTypeDetailsPath(credential_types[0].credential_configuration_id)
        )
      } else {
        navigate(routes.credentialTypes)
      }
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
      setLocalIssuanceError(null)
      setLocalPresentationError(null)
      setProcessingRequestType(null)

      const requestType = detectRequestType(value)

      if (requestType === 'issuance' || requestType === 'unknown') {
        const parsedOffer = parseCredentialOfferInput(value)
        if (parsedOffer) {
          setScanStatus('processing')
          setProcessingRequestType('issuance')
          setFeedbackMessage('Credential offer detected. Contacting issuer…')
          await submitOffer(parsedOffer.normalizedUri)
          setScanStatus('done')
          scanInProgressRef.current = false
          return
        }
      }

      if (requestType === 'presentation' || requestType === 'unknown') {
        const presentationResult = parsePresentationScanInput(value)
        if (presentationResult?.ok) {
          setScanStatus('processing')
          setProcessingRequestType('presentation')
          setFeedbackMessage('Presentation request detected. Contacting verifier…')
          const result = await startPresentationRequest({
            request: presentationResult.request,
            origin: window.location.origin,
          })
          if (result.ok) {
            navigate(routes.present)
          } else {
            setLocalPresentationError(result.error)
            setScanStatus('done')
          }
          scanInProgressRef.current = false
          return
        }

        if (presentationResult && !presentationResult.ok) {
          setLocalPresentationError(presentationResult.error)
          setScanStatus('done')
          scanInProgressRef.current = false
          return
        }
      }

      const apiError: IssuanceApiError = {
        httpStatus: 400,
        error: 'invalid_credential_offer',
        error_description: null,
      }
      const invalidQrMessage =
        requestType === 'presentation'
          ? presentationUserMessage({
              httpStatus: 400,
              code: 'invalid_request',
              message:
                'The scanned QR code does not contain a valid presentation request. Please try again.',
              error_description: null,
            })
          : requestType === 'issuance'
            ? issuanceUserMessage(apiError)
            : 'The scanned QR code is not a valid credential offer or presentation request. Please try again.'

      setLocalIssuanceError({
        apiError,
        userMessage: invalidQrMessage,
      })
      setScanStatus('done')
      scanInProgressRef.current = false
    },
    [navigate, startPresentationRequest, stopScanner, submitOffer]
  )

  useEffect(() => {
    facingModeRef.current = facingMode
  }, [facingMode])

  const startScan = useCallback(
    async (mode?: FacingMode) => {
      const selectedMode = mode ?? facingModeRef.current
      setIsScannerActive(true)
      resetOffer()
      setProcessingRequestType(null)
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

  const showIssuanceErrorCard =
    scanStatus === 'done' &&
    (offerState.status === 'error' || localIssuanceError !== null)
  const showPresentationErrorCard =
    scanStatus === 'done' &&
    (localPresentationError !== null || presentationSession.status === 'error')
  const presentationError =
    localPresentationError ??
    (presentationSession.status === 'error' ? presentationSession.error : null)
  const showProcessingOverlay =
    scanStatus === 'processing' || offerState.status === 'loading'
  const showErrorCard = showIssuanceErrorCard || showPresentationErrorCard
  const showFullscreenStatus = showProcessingOverlay || showErrorCard
  const showSpinner = scanStatus === 'processing' || offerState.status === 'loading'

  const handleErrorRetry = () => {
    resetOffer()
    resetPresentation()
    setLocalIssuanceError(null)
    setLocalPresentationError(null)
    setProcessingRequestType(null)
    void startScan()
  }

  const processingStatusMessage =
    processingRequestType === 'presentation'
      ? 'Processing proof request…'
      : processingRequestType === 'issuance'
        ? 'Just a moment while we make a secure connection...'
        : null

  const statusBarText = isInitializing
    ? '◉ Initializing scanner…'
    : `◉ ${feedbackMessage}`

  return (
    <PageContainer>
      <div className="mx-auto flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#E9ECEF]">
        {showProcessingOverlay && (
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
              <div className="flex flex-col gap-2">
                <div className="text-base text-slate-700">{feedbackMessage}</div>
                {processingStatusMessage && (
                  <div className="text-sm text-slate-500">{processingStatusMessage}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {showIssuanceErrorCard && (
          <IssuanceErrorCard
            error={offerState.status === 'error' ? offerState.apiError : null}
            rawMessage={
              offerState.status === 'error'
                ? offerState.rawMessage
                : localIssuanceError?.userMessage
            }
            onRetry={handleErrorRetry}
          />
        )}

        {showPresentationErrorCard && presentationError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
            <PresentationErrorCard
              error={presentationError}
              onRetry={handleErrorRetry}
              retryLabel="Scan again"
            />
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
              <p className="text-sm font-medium text-white">
                {processingStatusMessage ?? feedbackMessage}
              </p>
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

        {import.meta.env.VITE_E2E === 'true' && !showFullscreenStatus && (
          <>
            <button
              type="button"
              data-testid="e2e-simulate-scan"
              tabIndex={-1}
              aria-hidden
              className="sr-only"
              onClick={() => void handleDecodedValue(E2E_SCAN_SAMPLE_OFFER)}
            >
              E2E simulate scan
            </button>
            <button
              type="button"
              data-testid="e2e-simulate-invalid-offer"
              tabIndex={-1}
              aria-hidden
              className="sr-only"
              onClick={() => void handleDecodedValue('not-a-credential-offer')}
            >
              E2E simulate invalid offer
            </button>
          </>
        )}
      </div>
    </PageContainer>
  )
}
