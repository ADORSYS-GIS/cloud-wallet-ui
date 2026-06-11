import { RequestedClaimCard } from './RequestedClaimCard'
import type { RequestedClaimDisplay } from '../../utils/presentation/flattenRequestedClaims'

type RequestedClaimsSectionProps = {
  claims: RequestedClaimDisplay[]
}

export function RequestedClaimsSection({ claims }: RequestedClaimsSectionProps) {
  if (claims.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      {claims.map((claim) => (
        <RequestedClaimCard
          key={claim.id}
          label={claim.label}
          valuePreview={claim.valuePreview}
        />
      ))}
    </div>
  )
}
