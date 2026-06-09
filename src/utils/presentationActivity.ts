import type { PresentationActivityRecord } from '../types/presentationActivity'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Default retention aligned with ticket privacy requirement (backend should enforce too). */
export const DEFAULT_PRESENTATION_ACTIVITY_RETENTION_DAYS = 30

export function isPresentationActivityId(id: string): boolean {
  return UUID_RE.test(id)
}

export function getPresentationActivityRetentionDays(): number {
  const raw = import.meta.env.VITE_PRESENTATION_ACTIVITY_RETENTION_DAYS
  if (typeof raw !== 'string' || raw.trim() === '') {
    return DEFAULT_PRESENTATION_ACTIVITY_RETENTION_DAYS
  }
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_PRESENTATION_ACTIVITY_RETENTION_DAYS
  }
  return parsed
}

/** Drop records older than the configured retention window (defense in depth). */
export function filterWithinRetentionWindow(
  records: PresentationActivityRecord[],
  retentionDays: number = getPresentationActivityRetentionDays()
): PresentationActivityRecord[] {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
  return records.filter((record) => {
    const presentedAt = Date.parse(record.presented_at)
    return Number.isFinite(presentedAt) && presentedAt >= cutoff
  })
}

export function sortPresentationActivityNewestFirst(
  records: PresentationActivityRecord[]
): PresentationActivityRecord[] {
  return [...records].sort(
    (a, b) => Date.parse(b.presented_at) - Date.parse(a.presented_at)
  )
}

export function verifierDisplayLabel(
  verifier: PresentationActivityRecord['verifier']
): string {
  const trimmedName = verifier.name?.trim()
  if (trimmedName) return trimmedName
  const clientId = verifier.client_id
  const colonIdx = clientId.indexOf(':')
  if (colonIdx >= 0 && colonIdx < clientId.length - 1) {
    return clientId.slice(colonIdx + 1)
  }
  return clientId
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

/** Activity list timestamp — matches Figma (e.g. "Jun 08 2026 09:21:25"). */
export function formatPresentationActivityListTimestamp(iso: string): string {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return iso
  const month = MONTH_LABELS[date.getMonth()]
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${month} ${day} ${year} ${hours}:${minutes}:${seconds}`
}

export function formatPresentationTimestamp(iso: string): string {
  return formatPresentationActivityListTimestamp(iso)
}

const CREDENTIAL_TYPE_LABELS: Record<string, string> = {
  'eu.europa.ec.eudi.pid.1': 'Identity Credential',
  'org.iso.18013.5.1.mDL': 'Mobile Driving Licence',
}

const CREDENTIAL_TYPE_DESCRIPTIONS: Record<string, string> = {
  'eu.europa.ec.eudi.pid.1':
    'DATEV Unternehmensdaten für E-Rechnungsprozesse',
  'org.iso.18013.5.1.mDL': 'ISO 18013-5 mobile driving licence credential',
}

/** Human-readable credential title for shared-claims UI. */
export function credentialTypeDisplayName(typeId: string): string {
  const trimmed = typeId.trim()
  if (!trimmed) return 'Credential'
  return CREDENTIAL_TYPE_LABELS[trimmed] ?? trimmed
}

/** Description shown on the shared-claims detail card. */
export function credentialTypeDescription(typeId: string): string | undefined {
  const trimmed = typeId.trim()
  if (!trimmed) return undefined
  return CREDENTIAL_TYPE_DESCRIPTIONS[trimmed]
}
