import { presentationUserMessage } from '../../utils/presentation/presentationErrors'

type PresentationNoMatchingCredentialsProps = {
  onBack: () => void
}

export function PresentationNoMatchingCredentials({
  onBack,
}: PresentationNoMatchingCredentialsProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <p className="max-w-md text-base text-slate-700">
        {presentationUserMessage({
          code: 'no_matching_credentials',
          message: "You don't have a credential that satisfies this proof request.",
        })}
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-6 rounded-lg bg-[#99e827] px-8 py-2.5 text-base font-medium text-black shadow transition-colors hover:bg-[#66b80f] active:bg-[#5aa70d]"
      >
        Back to home
      </button>
    </div>
  )
}
