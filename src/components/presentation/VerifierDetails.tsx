import { IssuerAvatar } from '../issuance/IssuerAvater'
import {
  verifierDisplayName,
  verifierLogoUri,
  verifierPurpose,
} from '../../utils/presentation/verifierDisplay'
import type { VerifierMetadata } from '../../types/presentation'

type VerifierDetailsProps = {
  verifier: VerifierMetadata
}

/**
 * Compact verifier identity shown below the claim list (ticket #86).
 * Main headline uses the verifier name in the request sentence per Figma.
 */
export function VerifierDetails({ verifier }: VerifierDetailsProps) {
  const name = verifierDisplayName(verifier)
  const logoUri = verifierLogoUri(verifier)
  const purpose = verifierPurpose(verifier)

  return (
    <details className="rounded-md border border-slate-300/60 bg-[#e7eaed]">
      <summary className="cursor-pointer px-4 py-2.5 text-[13px] font-medium text-slate-700">
        Verifier information
      </summary>
      <div className="border-t border-slate-300/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <IssuerAvatar displayName={name} logoUri={logoUri} size="md" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-slate-900">{name}</p>
            <p className="truncate text-[11px] text-slate-500" title={verifier.client_id}>
              {verifier.client_id}
            </p>
          </div>
        </div>
        {purpose && (
          <p className="mt-2 text-[12px] leading-relaxed text-slate-600">{purpose}</p>
        )}
      </div>
    </details>
  )
}
