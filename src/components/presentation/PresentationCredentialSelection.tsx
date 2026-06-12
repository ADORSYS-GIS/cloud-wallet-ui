import type { CredentialSelection } from '../../types/presentation'
import type { SelectableCredential } from '../../utils/presentation/matchingCredentialDisplay'
import { PresentationCredentialCard } from './PresentationCredentialCard'

type PresentationCredentialSelectionProps = {
  credentials: SelectableCredential[]
  onSelect: (selected: CredentialSelection) => void
}

export function PresentationCredentialSelection({
  credentials,
  onSelect,
}: PresentationCredentialSelectionProps) {
  return (
    <div className="flex flex-1 flex-col px-4 pb-6 pt-10">
      <div className="mb-8 text-center">
        <h2 className="text-xl font-normal text-slate-900">Select a Credential</h2>
        <p className="mt-1 text-base text-slate-600">to present to</p>
      </div>

      <ul className="flex flex-col gap-4">
        {credentials.map((credential) => (
          <li key={`${credential.query_id}:${credential.credential_id}`}>
            <PresentationCredentialCard
              credential={credential}
              onClick={() =>
                onSelect({
                  query_id: credential.query_id,
                  credential_id: credential.credential_id,
                })
              }
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
