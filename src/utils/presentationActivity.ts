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

export function formatPresentationTimestamp(iso: string): string {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return iso
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
