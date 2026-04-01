import { BrowserQRCodeReader } from '@zxing/browser'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { submitCredentialOfferUri } from '../api/credentialOffer'
import { PageContainer } from '../components/layout/PageContainer'
import { routes } from '../constants/routes'
import { parseCredentialOfferInput } from '../utils/credentialOffer'

type ScanStatus = 'idle' | 'scanning' | 'success' | 'invalid' | 'error'
type FacingMode = 'environment' | 'user'

export function ScanPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle')
  const [decodedValue, setDecodedValue] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState(
    'Point your camera at a credential offer QR code.'
  )
  const [isScannerActive, setIsScannerActive] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [facingMode, setFacingMode] = useState<FacingMode>('environment')

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
    setDecodedValue(value)

    const parsedOffer = parseCredentialOfferInput(value)
    if (!parsedOffer) {
      setScanStatus('invalid')
      setFeedbackMessage(
        'Invalid credential offer QR content. Please scan a valid OpenID4VCI offer.'
      )
      scanInProgressRef.current = false
      return
    }

    try {
      const response = await submitCredentialOfferUri(parsedOffer.normalizedUri)
      if (!response.accepted) {
        setScanStatus('error')
        setFeedbackMessage(response.message || 'Credential offer rejected by backend.')
        return
      }

      setScanStatus('success')
      setFeedbackMessage('Credential offer validated and sent to backend successfully.')
    } catch {
      setScanStatus('error')
      setFeedbackMessage('Credential offer validated, but backend submission failed.')
    } finally {
      scanInProgressRef.current = false
    }
  }

  const startScan = async (mode: FacingMode = facingMode) => {
    setIsScannerActive(true)
    setFeedbackMessage('Requesting camera permission...')
    setDecodedValue('')
    setScanStatus('idle')

    if (!navigator?.mediaDevices?.getUserMedia) {
      setScanStatus('error')
      setFeedbackMessage('No camera device is available on this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode } },
      })
      stream.getTracks().forEach((track) => track.stop())
    } catch {
      setScanStatus('error')
      setFeedbackMessage(
        'Camera permission denied. Please allow camera access and retry.'
      )
      return
    }

    if (!videoRef.current) {
      setScanStatus('error')
      setFeedbackMessage('Video preview unavailable. Please reload and try again.')
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
    } catch {
      setScanStatus('error')
      setFeedbackMessage('Unable to start QR scanner. Check camera availability.')
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
    const nextMode: FacingMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextMode)
    stopScanner()
    await startScan(nextMode)
  }

  return (
    <PageContainer>
      <div className="mx-auto flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#E9ECEF]">
        <div className="flex items-center justify-between bg-[#499c9d] px-4 py-2 text-black">
          <span>To access the app from your phone, install now</span>
          <button className="rounded-lg bg-[#99e827] px-24 py-1 text-black">
            Install
          </button>
        </div>

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

        <section className="relative flex-1 bg-[#E9ECEF]">
          {isScannerActive && (
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              playsInline
            />
          )}

          {!isScannerActive && <div className="h-full w-full bg-[#E9ECEF]" />}

          {decodedValue && scanStatus === 'success' && (
            <div className="absolute top-4 left-1/2 w-[90%] -translate-x-1/2 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg bg-white/90 px-3 py-2 text-xs text-slate-700">
              {decodedValue}
            </div>
          )}

          {isScannerActive && scanStatus === 'scanning' && (
            <button
              onClick={() => void swapCamera()}
              className="absolute bottom-4 left-1/2 z-10 h-9 w-9 -translate-x-1/2 rounded-full bg-white text-lg text-slate-700 shadow"
              aria-label="Swap camera"
            >
              ↻
            </button>
          )}

          {(scanStatus === 'invalid' || scanStatus === 'error') && (
            <button
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
