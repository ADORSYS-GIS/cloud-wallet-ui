import { BrowserQRCodeReader } from '@zxing/browser'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { startIssuanceSession } from '../api/issuance'
import { Header } from '../components/Header'
import { PageContainer } from '../components/layout/PageContainer'
import { routes } from '../constants/routes'
import type { StartIssuanceResponse } from '../types/issuance'
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
  const [isSwapping, setIsSwapping] = useState(false)
  const [issuanceSession, setIssuanceSession] = useState<StartIssuanceResponse | null>(
    null
  )

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
      const session = await startIssuanceSession(parsedOffer.normalizedUri)
      setIssuanceSession(session)
      setScanStatus('success')
      setFeedbackMessage('Credential offer accepted. Review the details below.')
    } catch {
      setScanStatus('error')
      setFeedbackMessage('Failed to start issuance session. Please try again.')
    } finally {
      scanInProgressRef.current = false
    }
  }

  const startScan = async (mode: FacingMode = facingMode) => {
    setIsScannerActive(true)
    setIssuanceSession(null)
    setFeedbackMessage('Requesting camera permission...')
    setDecodedValue('')
    setScanStatus('idle')

    if (!navigator?.mediaDevices?.getUserMedia) {
      setIsScannerActive(false)
      setScanStatus('error')
      setFeedbackMessage('No camera device is available on this browser.')
      return
    }

    if (!videoRef.current) {
      setIsScannerActive(false)
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

  return (
    <PageContainer>
      <div className="mx-auto flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#E9ECEF]">
        <Header showMainHeader={false} />

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

        <div className="border-b border-slate-300 bg-[#e9ecef] py-1 text-center text-[15px] leading-none text-slate-700">
          {isInitializing ? '◉ Initializing scanner...' : `◉ ${feedbackMessage}`}
        </div>

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

          {/* ----------------------------------------------------------------
              Success overlay — show session details returned by /issuance/start
          ---------------------------------------------------------------- */}
          {scanStatus === 'success' && issuanceSession && (
            <div className="absolute inset-x-4 top-4 z-10 rounded-lg bg-white/95 p-4 shadow-md">
              <p className="mb-2 text-sm font-semibold text-slate-900">
                Issuance session started
              </p>

              <dl className="grid gap-1 text-xs text-slate-700">
                <div className="flex gap-2">
                  <dt className="shrink-0 text-slate-500">Session</dt>
                  <dd className="truncate font-mono">{issuanceSession.session_id}</dd>
                </div>

                <div className="flex gap-2">
                  <dt className="shrink-0 text-slate-500">Issuer</dt>
                  <dd>
                    {issuanceSession.issuer.display_name ??
                      issuanceSession.issuer.credential_issuer}
                  </dd>
                </div>

                <div className="flex gap-2">
                  <dt className="shrink-0 text-slate-500">Credentials offered</dt>
                  <dd>
                    {issuanceSession.credential_types
                      .map((ct) => ct.display.name)
                      .join(', ')}
                  </dd>
                </div>

                <div className="flex gap-2">
                  <dt className="shrink-0 text-slate-500">Flow</dt>
                  <dd>{issuanceSession.flow}</dd>
                </div>

                {issuanceSession.tx_code_required && issuanceSession.tx_code && (
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-slate-500">Transaction code</dt>
                    <dd>Required ({issuanceSession.tx_code.input_mode})</dd>
                  </div>
                )}

                <div className="flex gap-2">
                  <dt className="shrink-0 text-slate-500">Expires</dt>
                  <dd>{new Date(issuanceSession.expires_at).toLocaleTimeString()}</dd>
                </div>
              </dl>

              <p className="mt-3 text-xs text-slate-500">
                Consent and credential delivery are handled in the next step.
              </p>
            </div>
          )}

          {decodedValue && scanStatus !== 'success' && (
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

          {(scanStatus === 'invalid' || scanStatus === 'error') && (
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
