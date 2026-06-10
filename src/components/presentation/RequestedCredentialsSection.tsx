import { RequestedClaimCard } from './RequestedClaimCard'
import type {
  CredentialSetGroupDisplay,
  RequestedCredentialDisplay,
  SecurityWarning,
} from '../../utils/presentation/dcqlDisplay'

type RequestedCredentialsSectionProps = {
  credentials: RequestedCredentialDisplay[]
  credentialSetGroups: CredentialSetGroupDisplay[]
  securityWarnings: SecurityWarning[]
  scopeLabel?: string
}

function formatCredentialSetOption(optionLabels: string[]): string {
  if (optionLabels.length === 1) {
    return optionLabels[0]
  }
  return optionLabels.join(' and ')
}

function CredentialSetSummary({ groups }: { groups: CredentialSetGroupDisplay[] }) {
  if (groups.length === 0) return null

  return (
    <p className="text-[13px] leading-snug text-slate-600">
      {groups.map((group) => (
        <span key={group.label} className="block">
          <span className="font-medium text-slate-800">{group.label}:</span>{' '}
          {group.required
            ? `Select at least one from ${group.optionLabels
                .map((option) => formatCredentialSetOption(option))
                .join(' OR ')}`
            : `Optionally provide one of ${group.optionLabels
                .map((option) => formatCredentialSetOption(option))
                .join(' OR ')}`}
        </span>
      ))}
    </p>
  )
}

function flattenClaimCards(
  credentials: RequestedCredentialDisplay[],
  scopeLabel?: string
) {
  const cards: Array<{
    id: string
    label: string
    valuePreview?: string
    mandatory?: boolean
  }> = []

  if (scopeLabel) {
    cards.push({
      id: 'scope',
      label: 'Requested scope',
      valuePreview: scopeLabel,
      mandatory: true,
    })
  }

  for (const credential of credentials) {
    if (credential.claims.length > 0) {
      for (const claim of credential.claims) {
        cards.push({
          id: claim.id,
          label: claim.label,
          valuePreview: claim.valuePreview,
          mandatory: claim.mandatory,
        })
      }
      continue
    }

    cards.push({
      id: credential.id,
      label: credential.typeLabel ?? credential.id,
      valuePreview: 'Requested',
      mandatory: true,
    })
  }

  return cards
}

export function RequestedCredentialsSection({
  credentials,
  credentialSetGroups,
  securityWarnings,
  scopeLabel,
}: RequestedCredentialsSectionProps) {
  const claimCards = flattenClaimCards(credentials, scopeLabel)

  return (
    <div className="space-y-3">
      <CredentialSetSummary groups={credentialSetGroups} />

      <div className="space-y-2">
        {claimCards.map((claim) => (
          <RequestedClaimCard
            key={claim.id}
            label={claim.label}
            valuePreview={claim.valuePreview}
            mandatory={claim.mandatory}
          />
        ))}
      </div>

      {securityWarnings.length > 0 && (
        <div
          role="alert"
          className="space-y-1 rounded-md border border-[#96a8b2] bg-[#e7eaed] px-3 py-2"
        >
          {securityWarnings.map((warning) => (
            <p key={warning.id} className="text-[12px] leading-snug text-slate-700">
              {warning.message}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
