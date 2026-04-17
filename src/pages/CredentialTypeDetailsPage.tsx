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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-2xl">
        {!isError && (
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#99e827]" />
        )}
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

  // Redirect guard
  const shouldRedirect = !session || !selectedType || !optionId
  useEffect(() => {
    if (shouldRedirect) {
      navigate(routes.credentialTypes, { replace: true })
    }
  }, [navigate, shouldRedirect])

  // SSE stream hook
  const { streamStatus, openStream, closeStream } = useSseStream()

  // Overlay state
  const [overlay, setOverlay] = useState<OverlayStatus>({ kind: 'hidden' })

  const doAuthRedirect = useAuthRedirect()


  useEffect(() => {
    if (streamStatus.status === 'processing') {
      setOverlay({ kind: 'processing', step: streamStatus.step })

    } else if (streamStatus.status === 'completed') {
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
      setOverlay({ kind: 'failed', message: msg })
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
      return
    }


    openStream(session.session_id)

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

      case 'none':e.
        setOverlay({ kind: 'processing', step: '' })
        break

      case 'rejected':
        setOverlay({ kind: 'hidden' })
        closeStream()
        navigate(routes.scan, { replace: true })
        break
    }
  }

  const handleTxCodeSubmit = async (code: string) => {
    if (
      overlay.kind !== 'awaiting_tx_code' &&
      overlay.kind !== 'tx_code_error'
    )
      return

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
    }
  }

  const handleTxCodeCancel = async () => {
    closeStream()
    try {
      await cancelSession(session.session_id)
    } catch {
      // Best-effort — session may already be expired/cancelled
    }
    navigate(routes.credentialTypes)
  }

  const handleOverlayRetry = () => {
    setOverlay({ kind: 'hidden' })
    closeStream()
  }

  const handleCancel = async () => {
    closeStream()
    if (overlay.kind !== 'hidden') {
      // Only cancel if a session operation is in progress
      try {
        await cancelSession(session.session_id)
      } catch {
        // Best-effort
      }
    }
    navigate(routes.credentialTypes)
  }

  // Is the TX code overlay active?
  const isTxCodeActive =
    overlay.kind === 'awaiting_tx_code' ||
    overlay.kind === 'submitting_tx_code' ||
    overlay.kind === 'tx_code_error'

  return (
    <PageContainer fullWidth>
      <ProcessingOverlay status={overlay} onRetry={handleOverlayRetry} />

      <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#e7eaed] font-serif">
        {/* Sub-header */}
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

        {/* Content */}
        <section className="flex-1 overflow-y-auto px-1 py-1">
          <div className="rounded-md bg-[#e7eaed] p-1.5">
            {/* Issuer / credential card */}
            <div className="mb-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
              <div className="flex flex-col items-start gap-1">
                <IssuerAvatar
                  displayName={issuerName}
                  logoUri={issuerLogoUri}
                  size="sm"
                />
              </div>
              <p className="mt-2 text-[14px] md:text-[15px] font-semibold leading-tight text-slate-900">
                {selectedType.display.name}
              </p>
              <p className="text-[12px] md:text-[13px] leading-tight text-slate-500">
                {issuerName}
              </p>
            </div>

            {/* Credential type display fields */}
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

        {/* TX Code input overlay (inline, over the camera/content area) */}
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

        {/* Actions */}
        <div className="px-2 pb-1">
          {/* Issue VC button */}
          <button
            type="button"
            onClick={() => void handleIssueVc()}
            disabled={overlay.kind !== 'hidden'}
            className="h-9 w-full rounded-[4px] bg-[#99e827] text-[14px] font-semibold text-slate-900 transition-colors duration-150 hover:bg-[#89d61f] active:bg-[#7dc31a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Issue VC
          </button>

          {/* Cancel button */}
          <button
            type="button"
            onClick={() => void handleCancel()}
            disabled={false}
            className="mt-1 h-7 w-full rounded-[4px] bg-transparent text-[14px] text-slate-700 transition-colors duration-150 hover:bg-slate-100 active:bg-slate-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </PageContainer>
  )
}
