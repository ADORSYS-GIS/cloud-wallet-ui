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
    <div className="flex flex-1 flex-col pb-6 pt-8">
      <div className="mb-6 px-4 text-center">
        <h2 className="text-xl font-normal text-slate-900">Select a credential</h2>
        <p className="mt-1 text-base text-slate-600">to present to</p>
      </div>

      <ul className="flex flex-col">
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
