import { useState } from 'react'
import type { MatchingCredential } from '../../types/presentation'
import { resolveMatchingCredentialDisplay } from '../../utils/presentation/matchingCredentialDisplay'

type PresentationCredentialCardProps = {
  credential: MatchingCredential
  onClick: () => void
}

export function PresentationCredentialCard({
  credential,
  onClick,
}: PresentationCredentialCardProps) {
  const { name, issuerName, logoUri } = resolveMatchingCredentialDisplay(credential)
  const [imgFailed, setImgFailed] = useState(false)

  const initials = name.slice(0, 2).toUpperCase()
  const showLogo = Boolean(logoUri) && !imgFailed

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full border-b border-[#d1d5db] bg-[#f2f2f2] px-3 py-3 text-left font-sans transition-transform duration-200 hover:scale-[1.003] active:scale-[0.99]"
    >
      <div className="flex items-center gap-4">
        {showLogo ? (
          <img
            src={logoUri ?? undefined}
            alt=""
            className="h-9 w-9 shrink-0 object-contain"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#99e827] text-[10px] font-bold leading-none text-white"
            aria-hidden
          >
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-base font-semibold leading-6 text-slate-900">
            {name}
          </p>
          <p className="truncate text-sm leading-[21px] text-slate-700">{issuerName}</p>
        </div>
      </div>
    </button>
  )
}
