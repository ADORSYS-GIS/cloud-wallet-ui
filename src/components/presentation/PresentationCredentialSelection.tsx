import type { MatchingCredential, SelectedCredential } from '../../types/presentation'
import { PresentationCredentialCard } from './PresentationCredentialCard'

type PresentationCredentialSelectionProps = {
  matchingCredentials: MatchingCredential[]
  onSelect: (selected: SelectedCredential) => void
}

export function PresentationCredentialSelection({
  matchingCredentials,
  onSelect,
}: PresentationCredentialSelectionProps) {
  return (
    <div className="flex flex-1 flex-col px-4 pb-6 pt-10">
      <div className="mb-8 text-center">
        <h2 className="text-xl font-semibold text-slate-800">Select a Credential</h2>
        <p className="mt-1 text-base text-slate-700">to present to</p>
      </div>

      <ul className="flex flex-col gap-3">
        {matchingCredentials.map((credential) => (
          <li key={credential.credentialId}>
            <PresentationCredentialCard
              credential={credential}
              onClick={() =>
                onSelect({
                  credentialId: credential.credentialId,
                  queryId: credential.queryId,
                  format: credential.format,
                })
              }
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
