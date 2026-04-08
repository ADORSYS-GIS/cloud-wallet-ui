import { BrowserQRCodeReader } from '@zxing/browser'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { resolveCredentialOfferUri } from '../api/credentialOffer'
import { Header } from '../components/Header'
import { PageContainer } from '../components/layout/PageContainer'
import { routes } from '../constants/routes'
import { parseCredentialOfferInput } from '../utils/credentialOffer'
import { useCredentialOfferState } from '../state/credentialOffer'
import { ApiError } from '../api/client'
import type { BackendErrorEnvelope } from '../types/credentialOffer'
import illuWallet from '../assets/illu-wallet.png'

type ScanStatus = 'idle' | 'scanning' | 'success' | 'invalid' | 'error'
type FacingMode = 'environment' | 'user'

// TODO(#93-backend-integration): Align error-code mapping with backend error taxonomy.
// Once backend is finalized, map status+code to stable UI kinds and messages.
function mapApiErrorToUiError(e: ApiError<BackendErrorEnvelope>) {
  const code = e.body?.error?.code
  const messageFromBackend = e.body?.error?.message

  // Conservative defaults until backend codes are finalized.
  if (
    code === 'EXPIRED_PRE_AUTH_CODE' ||
    code === 'EXPIRED_PRE_AUTH' ||
    code === 'invalid_grant'
  ) {
    return {
      kind: 'expired_pre_auth_code' as const,
      code,
      message:
        messageFromBackend || 'This pre-authorized code has expired. Please scan again.',
      retryable: false,
    }
  }

  if (code === 'INVALID_OFFER' || code === 'INVALID_CREDENTIAL_OFFER') {
    return {
      kind: 'invalid_offer' as const,
      code,
      message:
        messageFromBackend || 'The credential offer is invalid. Please scan a new one.',
      retryable: false,
    }
  }

  if (e.status >= 500) {
    return {
      kind: 'server' as const,
      code,
      message: messageFromBackend || 'The server returned an error. Please try again.',
      retryable: true,
    }
  }

  return {
    kind: 'unknown' as const,
    code,
    message: messageFromBackend || `Request failed with ${e.status}.`,
    retryable: e.status >= 500,
  }
}

export function ScanPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const offerState = useCredentialOfferState()
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle')
  const [decodedValue, setDecodedValue] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState(
    'Point your camera at a credential offer QR code.'
  )
  const [isScannerActive, setIsScannerActive] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [facingMode, setFacingMode] = useState<FacingMode>('environment')
  const [isSwapping, setIsSwapping] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<BrowserQRCodeReader | null>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const scanInProgressRef = useRef(false)

  const stopScanner = () => {
    controlsRef.current?.stop()
    controlsRef.current = null
  }

  const handleDecodedValue = async (value: string) => {
    if (scanInProgressRef.current) {
      return
    }

    scanInProgressRef.current = true
    stopScanner()
    setIsScannerActive(false)
    setDecodedValue(value)
    offerState.clear()

    const parsedOffer = parseCredentialOfferInput(value)
    if (!parsedOffer) {
      setScanStatus('invalid')
      setFeedbackMessage(
        'Invalid credential offer QR content. Please scan a valid OpenID4VCI offer.'
      )
      offerState.setError({
        kind: 'invalid_offer',
        code: 'E0020',
        message: 'We could not parse the QR code you have scanned.',
        retryable: false,
      })
      scanInProgressRef.current = false
      return
    }

    try {
      offerState.setLoading()
      setFeedbackMessage('Just a moment while we make a secure connection...')
      // TODO(#93-backend-integration): This depends on backend /credential-offer being available.
      // Until the backend is implemented, failures here will trigger the full-screen error state.
      const response = await resolveCredentialOfferUri(parsedOffer.normalizedUri)
      offerState.setOffer(response)
      setScanStatus('success')
      setFeedbackMessage('Credential offer resolved successfully.')
    } catch (e) {
      setScanStatus('error')
      if (e instanceof ApiError) {
        const uiError = mapApiErrorToUiError(e as ApiError<BackendErrorEnvelope>)
        offerState.setError(uiError)
        setFeedbackMessage(uiError.message)
      } else {
        offerState.setError({
          kind: 'network',
          message: 'Network error while contacting backend. Please try again.',
          retryable: true,
        })
        setFeedbackMessage('Network error while contacting backend.')
      }
    } finally {
      scanInProgressRef.current = false
    }
  }

  const startScan = async (mode: FacingMode = facingMode) => {
    setIsScannerActive(true)
    setFeedbackMessage('Requesting camera permission...')
    setDecodedValue('')
    setScanStatus('idle')
    offerState.clear()

    if (!navigator?.mediaDevices?.getUserMedia) {
      setIsScannerActive(false)
      setScanStatus('error')
      setFeedbackMessage('No camera device is available on this browser.')
      offerState.setError({
        kind: 'unknown',
        message: 'No camera device is available on this browser.',
        retryable: false,
      })
      return
    }

    if (!videoRef.current) {
      setIsScannerActive(false)
      setScanStatus('error')
      setFeedbackMessage('Video preview unavailable. Please reload and try again.')
      offerState.setError({
        kind: 'unknown',
        message: 'Video preview unavailable. Please reload and try again.',
        retryable: false,
      })
      return
    }

    setScanStatus('scanning')
    setFeedbackMessage('Searching for QR code...')

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
      setScanStatus('error')
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setFeedbackMessage(
          'Camera permission denied. Please allow camera access and retry.'
        )
        return
      }
      setFeedbackMessage('Unable to start QR scanner. Check camera availability.')
      offerState.setError({
        kind: 'unknown',
        message: 'Unable to start QR scanner. Check camera availability.',
        retryable: false,
      })
    }
  }

  useEffect(() => {
    let mounted = true
    const isFreshScan = searchParams.get('fresh') === 'true'
    if (isFreshScan) {
      navigate(routes.scan, { replace: true })
    }

    const timer = window.setTimeout(() => {
      if (!mounted) {
        return
      }
      setIsInitializing(false)
      void startScan()
    }, 220)

    return () => {
      mounted = false
      window.clearTimeout(timer)
    }
    // We intentionally run this once on page entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      stopScanner()
      readerRef.current = null
    }
  }, [])

  const swapCamera = async () => {
    if (isSwapping) {
      return
    }

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

  const showFullscreenStatus =
    offerState.status === 'loading' ||
    (offerState.status === 'error' && !!offerState.error)

  return (
    <PageContainer>
      <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#E9ECEF]">
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
        {showFullscreenStatus && offerState.status === 'error' && offerState.error && (
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
              <div className="text-base text-slate-700">{offerState.error.message}</div>
              <button
                onClick={() => void startScan()}
                className="mt-6 rounded-lg bg-[#99e827] px-8 py-2.5 text-base font-medium text-black shadow transition-colors hover:bg-[#66b80f] active:bg-[#5aa70d]"
              >
                Scan again
              </button>
            </div>
          </div>
        )}

        <Header showMainHeader={false} />

        {!showFullscreenStatus && (
          <>
            <div className="grid grid-cols-[auto_1fr_auto] items-center border-b border-[#96a8b2] bg-gradient-to-r from-[#3f6f7e] to-[#4e7f8f] px-2 py-2">
              <button
                onClick={() => navigate(routes.home)}
                className="h-7 w-7 rounded-full text-xl leading-none text-white"
                aria-label="Back"
              >
                ‹
              </button>
              <div />
              <div className="w-7" />
            </div>

            <div className="border-b border-slate-300 bg-[#e9ecef] py-1 text-center text-[15px] leading-none text-slate-700">
              {isInitializing ? '◉ Initializing scanner...' : `◉ ${feedbackMessage}`}
            </div>
          </>
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

          {decodedValue && scanStatus === 'success' && (
            <div className="absolute top-4 left-1/2 w-[90%] -translate-x-1/2 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg bg-white/90 px-3 py-2 text-xs text-slate-700">
              {decodedValue}
            </div>
          )}

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

          {(scanStatus === 'invalid' || scanStatus === 'error') &&
            offerState.status !== 'loading' &&
            offerState.status !== 'error' && (
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
