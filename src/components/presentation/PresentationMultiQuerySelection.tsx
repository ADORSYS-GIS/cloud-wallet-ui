import { useState, useCallback, useMemo } from 'react'
import type { CredentialMatch, CredentialSelection } from '../../types/presentation'
import { PresentationCredentialCard } from './PresentationCredentialCard'

type PresentationMultiQuerySelectionProps = {
  matches: CredentialMatch[]
  onContinue: (selections: CredentialSelection[]) => void
}

export function PresentationMultiQuerySelection({
  matches,
  onContinue,
}: PresentationMultiQuerySelectionProps) {
  const [selections, setSelections] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {}
    for (const match of matches) {
      if (match.candidates.length === 1) {
        initial[match.query_id] = match.candidates[0].credential_id
      } else {
        initial[match.query_id] = null
      }
    }
    return initial
  })

  const handleSelect = useCallback((queryId: string, credentialId: string) => {
    setSelections((prev) => ({ ...prev, [queryId]: credentialId }))
  }, [])

  const allRequiredSelected = useMemo(() => {
    return matches.every((match) => {
      if (!match.required) return true
      return selections[match.query_id] !== null
    })
  }, [matches, selections])

  const handleContinue = useCallback(() => {
    const selected: CredentialSelection[] = []
    for (const match of matches) {
      const credentialId = selections[match.query_id]
      if (credentialId) {
        selected.push({ query_id: match.query_id, credential_id: credentialId })
      }
    }
    onContinue(selected)
  }, [matches, selections, onContinue])

  return (
    <div className="flex flex-1 flex-col px-4 pb-6 pt-10">
      <div className="mb-8 text-center">
        <h2 className="text-xl font-normal text-slate-900">Select Credentials</h2>
        <p className="mt-1 text-base text-slate-600">to present</p>
      </div>

      <div className="flex-1 space-y-6">
        {matches.map((match) => (
          <div key={match.query_id}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">{match.query_id}</p>
              {match.required ? (
                <span className="text-xs font-medium text-red-600">Required</span>
              ) : (
                <span className="text-xs font-medium text-slate-500">Optional</span>
              )}
            </div>

            {match.candidates.length === 0 ? (
              <p className="text-sm text-slate-500 italic">
                No matching credentials available
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {match.candidates.map((candidate) => {
                  const isSelected =
                    selections[match.query_id] === candidate.credential_id
                  return (
                    <li key={candidate.credential_id}>
                      <PresentationCredentialCard
                        credential={{
                          ...candidate,
                          query_id: match.query_id,
                          required: match.required,
                        }}
                        selected={isSelected}
                        onClick={() =>
                          handleSelect(match.query_id, candidate.credential_id)
                        }
                      />
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 shrink-0">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!allRequiredSelected}
          className="h-10 w-full rounded-[4px] bg-[#99e827] text-[16px] font-normal text-slate-900 transition-colors duration-150 hover:bg-[#89d61f] active:bg-[#7dc31a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
