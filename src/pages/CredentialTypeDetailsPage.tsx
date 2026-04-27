import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IssuerAvatar } from '../components/issuance/IssuerAvater'
import { TxCodeInput } from '../components/issuance/TxCodeInput'
import { PageContainer } from '../components/layout/PageContainer'
import { routes, issuanceSuccessPath } from '../constants/routes'
import { useCredentialOfferState } from '../state/issuance.state'
import { submitConsent, submitTxCode, cancelSession } from '../api/issuance-session'
import { useSseStream } from '../hooks/useSseStream'

import type { ConsentResponse, TxCodeSpec } from '../types/issuance'
import illuWallet from '../assets/illu-wallet.png'

function useSelectedType(
  session: ReturnType<typeof useCredentialOfferState>['offer'],
  optionId: string | undefined
) {
  return useMemo(() => {
    if (!session || !optionId) return null
    return (
      session.credential_types.find(
        (ct) => ct.credential_configuration_id === optionId
      ) ?? null
    )
  }, [optionId, session])
}

type ClaimRow = { label: string; value: string }

function buildDisplayRows(
  credType: NonNullable<ReturnType<typeof useSelectedType>>
): ClaimRow[] {
  const rows: ClaimRow[] = [
    { label: 'Credential Configuration ID', value: credType.credential_configuration_id },
    { label: 'Format', value: credType.format },
    { label: 'Name', value: credType.display.name },
  ]

  if (credType.display.description) {
    rows.push({ label: 'Description', value: credType.display.description })
  }
  if (credType.display.background_color) {
    rows.push({ label: 'Background Color', value: credType.display.background_color })
  }
  if (credType.display.text_color) {
    rows.push({ label: 'Text Color', value: credType.display.text_color })
  }
  if (credType.display.logo?.uri) {
    rows.push({ label: 'Logo URI', value: credType.display.logo.uri })
  }
  if (credType.display.logo?.alt_text) {
    rows.push({ label: 'Logo Alt Text', value: credType.display.logo.alt_text })
  }

  return rows
}

type ProcessingStep =
  | 'exchanging_token'
  | 'requesting_credential'
  | 'awaiting_deferred_credential'
  | string

const STEP_LABELS: Record<string, string> = {
  exchanging_token: 'Exchanging authorization token…',
  requesting_credential: 'Requesting credential from issuer…',
  awaiting_deferred_credential: 'Waiting for deferred credential…',
}
const PROCESSING_TIMEOUT_MS = 45_000

function stepLabel(step: ProcessingStep): string {
  return STEP_LABELS[step] ?? 'Processing…'
}

type OverlayStatus =
  | { kind: 'hidden' }
  | { kind: 'submitting' }
  | { kind: 'awaiting_tx_code'; txCodeSpec: TxCodeSpec }
  | { kind: 'submitting_tx_code'; txCodeSpec: TxCodeSpec }
  | { kind: 'tx_code_error'; txCodeSpec: TxCodeSpec; errorMessage: string }
  | { kind: 'processing'; step: ProcessingStep }
  | { kind: 'failed'; message: string }

function ProcessingOverlay({
  status,
  onRetry,
}: {
  status: OverlayStatus
  onRetry: () => void
}) {
  if (status.kind === 'hidden') return null

  const isError = status.kind === 'failed'
  const message =
    status.kind === 'submitting'
      ? 'Submitting consent…'
      : status.kind === 'processing'
        ? stepLabel(status.step)
        : status.kind === 'failed'
          ? status.message
          : ''

  if (
    status.kind === 'awaiting_tx_code' ||
    status.kind === 'submitting_tx_code' ||
    status.kind === 'tx_code_error'
  ) {
    return null
  }

  if (!isError) {
    return (
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
          <div className="mt-2 text-sm text-slate-500">{message}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-2xl">
        {isError && (
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-xl">
            ⚠️
          </div>
        )}
        <p className="text-sm leading-relaxed text-slate-700">{message}</p>
        {isError && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 w-full rounded-lg bg-[#99e827] py-2.5 text-sm font-semibold text-slate-900"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  )
}

function useAuthRedirect() {
  const redirected = useRef(false)

  return useCallback((url: string) => {
    if (redirected.current) return
    redirected.current = true
    window.location.href = url
  }, [])
}

export function CredentialTypeDetailsPage() {
  const { optionId } = useParams<{ optionId: string }>()
  const navigate = useNavigate()
  const offerState = useCredentialOfferState()

  const session = offerState.offer
  const selectedType = useSelectedType(session, optionId)

  const issuerName =
    session?.issuer.display_name ??
    (session ? new URL(session.issuer.credential_issuer).host : 'Issuer')
  const issuerLogoUri = session?.issuer.logo_uri ?? null

  const shouldRedirect = !session || !selectedType || !optionId
  useEffect(() => {
    if (shouldRedirect) {
      navigate(routes.credentialTypes, { replace: true })
    }
  }, [navigate, shouldRedirect])

  const { streamStatus, openStream, closeStream } = useSseStream()

  const [overlay, setOverlay] = useState<OverlayStatus>({ kind: 'hidden' })
  const [isCancelling, setIsCancelling] = useState(false)
  const issueInFlightRef = useRef(false)
  const txCodeSubmitInFlightRef = useRef(false)
  const txCodeCancelInFlightRef = useRef(false)

  const doAuthRedirect = useAuthRedirect()

  const lastHandledSseStatus = useRef<string>('')

  useEffect(() => {
    const hasActiveProcessing =
      overlay.kind === 'submitting' ||
      overlay.kind === 'submitting_tx_code' ||
      overlay.kind === 'processing'

    if (!hasActiveProcessing) return

    const timeoutId = window.setTimeout(() => {
      closeStream()
      setOverlay({
        kind: 'failed',
        message:
          'The issuer is taking longer than expected to respond. Please try again.',
      })
    }, PROCESSING_TIMEOUT_MS)

    return () => window.clearTimeout(timeoutId)
  }, [overlay, closeStream])

  useEffect(() => {
    const statusKey =
      streamStatus.status === 'processing'
        ? `processing:${streamStatus.step}`
        : streamStatus.status

    if (lastHandledSseStatus.current === statusKey) return
    lastHandledSseStatus.current = statusKey

    if (streamStatus.status === 'processing') {
      const step = streamStatus.step
      const id = setTimeout(() => {
        setOverlay({ kind: 'processing', step })
      }, 0)
      return () => clearTimeout(id)
    }

    if (streamStatus.status === 'completed') {
      closeStream()
      const firstId = streamStatus.credentialIds[0]
      navigate(issuanceSuccessPath(firstId), {
        state: { credentialId: firstId },
      })
    } else if (streamStatus.status === 'failed') {
      closeStream()
      const msg =
        streamStatus.errorDescription ??
        `Issuance failed at step "${streamStatus.step}": ${streamStatus.error}`
      const id = setTimeout(() => {
        setOverlay({ kind: 'failed', message: msg })
      }, 0)
      return () => clearTimeout(id)
    }
  }, [streamStatus, closeStream, navigate])

  useEffect(
    () => () => {
      closeStream()
    },
    [closeStream]
  )

  if (shouldRedirect || !session || !selectedType) return null

  const displayRows = buildDisplayRows(selectedType)

  const handleIssueVc = async () => {
    if (issueInFlightRef.current || isCancelling) return
    issueInFlightRef.current = true
    setOverlay({ kind: 'submitting' })

    let consentResponse: ConsentResponse
    try {
      consentResponse = await submitConsent(session.session_id, true, [
        selectedType.credential_configuration_id,
      ])
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Could not submit consent. Please try again.'
      setOverlay({ kind: 'failed', message: msg })
      issueInFlightRef.current = false
      return
    }

    openStream(session.session_id)

    try {
      switch (consentResponse.next_action) {
        case 'redirect':
          if (consentResponse.authorization_url) {
            doAuthRedirect(consentResponse.authorization_url)
            setOverlay({ kind: 'processing', step: 'authorization' })
          } else {
            setOverlay({
              kind: 'failed',
              message: 'Authorization URL missing from server response.',
            })
          }
          break

        case 'provide_tx_code': {
          const txSpec = session.tx_code
          if (!txSpec) {
            setOverlay({
              kind: 'failed',
              message:
                'Server requested a transaction code but did not provide the code spec. Please restart the flow.',
            })
            return
          }
          setOverlay({ kind: 'awaiting_tx_code', txCodeSpec: txSpec })
          break
        }

        case 'none':
          setOverlay({ kind: 'processing', step: '' })
          break

        case 'rejected':
          setOverlay({ kind: 'hidden' })
          closeStream()
          navigate(routes.scan, { replace: true })
          break
      }
    } finally {
      issueInFlightRef.current = false
    }
  }

  const handleTxCodeSubmit = async (code: string) => {
    if (txCodeSubmitInFlightRef.current || isCancelling) return
    if (overlay.kind !== 'awaiting_tx_code' && overlay.kind !== 'tx_code_error') return

    txCodeSubmitInFlightRef.current = true
    const txCodeSpec = overlay.txCodeSpec
    setOverlay({ kind: 'submitting_tx_code', txCodeSpec })

    try {
      await submitTxCode(session.session_id, code)
      setOverlay({ kind: 'processing', step: 'exchanging_token' })
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Invalid transaction code. Please check and try again.'
      setOverlay({ kind: 'tx_code_error', txCodeSpec, errorMessage: msg })
    } finally {
      txCodeSubmitInFlightRef.current = false
    }
  }

  const handleTxCodeCancel = async () => {
    if (txCodeCancelInFlightRef.current || isCancelling) return
    txCodeCancelInFlightRef.current = true
    closeStream()
    try {
      await cancelSession(session.session_id)
    } catch {
      void 0
    }
    navigate(routes.credentialTypes)
    txCodeCancelInFlightRef.current = false
  }

  const handleOverlayRetry = () => {
    setOverlay({ kind: 'hidden' })
    closeStream()
  }

  const handleCancel = async () => {
    if (isCancelling) return
    setIsCancelling(true)
    closeStream()
    if (overlay.kind !== 'hidden') {
      try {
        await cancelSession(session.session_id)
      } catch {
        void 0
      }
    }
    navigate(routes.credentialTypes)
    setIsCancelling(false)
  }

  const isTxCodeActive =
    overlay.kind === 'awaiting_tx_code' ||
    overlay.kind === 'submitting_tx_code' ||
    overlay.kind === 'tx_code_error'

  return (
    <PageContainer fullWidth>
      <ProcessingOverlay status={overlay} onRetry={handleOverlayRetry} />

      <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#e7eaed] font-serif">
        <div className="grid grid-cols-[auto_1fr_auto] items-center border-b border-[#96a8b2] bg-gradient-to-r from-[#3f6f7e] to-[#4e7f8f] px-2 py-2">
          <button
            type="button"
            onClick={() => navigate(routes.credentialTypes)}
            className="h-10 w-10 rounded-full text-3xl leading-none text-white"
            aria-label="Back"
          >
            ‹
          </button>
          <div className="text-center text-[16px] md:text-[18px] font-semibold leading-none text-white">
            Credential Type Details
          </div>
          <div className="w-10" />
        </div>

        <section className="flex-1 overflow-y-auto px-1 py-1">
          <div className="rounded-md bg-[#e7eaed] p-1.5">
            <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-200 hover:scale-[1.01] hover:shadow-md hover:border-[#4b7c8c]/30 hover:bg-[#e6f4e6] active:scale-[0.98]">
              <div className="flex items-center gap-4 px-5 py-12">
                <IssuerAvatar
                  displayName={issuerName}
                  logoUri={issuerLogoUri}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold tracking-tight text-slate-900">
                    {selectedType.display.name}
                  </p>
                  <p className="mt-0.5 truncate text-[14px] leading-relaxed text-slate-500">
                    {issuerName}
                  </p>
                </div>
              </div>
            </div>

            <p className="mb-2 text-[18px] md:text-[19px] font-semibold leading-tight text-slate-900">
              Credential details:
            </p>
            <ul className="space-y-px">
              {displayRows.map((row, index) => (
                <li
                  key={row.label}
                  className={[
                    'flex min-h-7 items-start rounded-sm px-2 py-1.5 text-[13px] md:text-[14px] leading-tight text-slate-900 gap-2',
                    index % 2 === 0 ? 'bg-[#efefef]' : 'bg-[#f8f8f8]',
                  ].join(' ')}
                >
                  <span className="shrink-0 font-medium text-slate-700 min-w-[130px]">
                    {row.label}
                  </span>
                  <span className="break-all text-slate-900">{row.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {isTxCodeActive && (
          <div className="absolute inset-x-0 top-0 z-30 flex h-full items-start justify-center bg-black/40 pt-16">
            <div className="w-full max-w-sm px-3">
              <TxCodeInput
                txCodeSpec={
                  overlay.kind === 'awaiting_tx_code' ||
                  overlay.kind === 'submitting_tx_code' ||
                  overlay.kind === 'tx_code_error'
                    ? overlay.txCodeSpec
                    : (session.tx_code as NonNullable<typeof session.tx_code>)
                }
                sessionId={session.session_id}
                onSubmit={handleTxCodeSubmit}
                onCancel={() => void handleTxCodeCancel()}
                isSubmitting={overlay.kind === 'submitting_tx_code'}
                error={overlay.kind === 'tx_code_error' ? overlay.errorMessage : null}
              />
            </div>
          </div>
        )}

        <div className="px-2 pb-1">
          <button
            type="button"
            onClick={() => void handleIssueVc()}
            disabled={overlay.kind !== 'hidden' || isCancelling}
            className="h-9 w-full rounded-[4px] bg-[#99e827] text-[14px] font-normal text-slate-900 transition-colors duration-150 hover:bg-[#89d61f] active:bg-[#7dc31a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Issue VC
          </button>

          <button
            type="button"
            onClick={() => void handleCancel()}
            disabled={isCancelling}
            className="mt-1 h-7 w-full rounded-[4px] bg-transparent text-[14px] text-slate-700 transition-colors duration-150 hover:bg-slate-100 active:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCancelling ? 'Cancelling…' : 'Cancel'}
          </button>
        </div>
      </div>
    </PageContainer>
  )
}
