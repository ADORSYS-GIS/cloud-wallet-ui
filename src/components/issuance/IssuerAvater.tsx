import { useState } from 'react'

type IssuerAvatarSize = 'sm' | 'md'

const SIZE_CLASSES: Record<IssuerAvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-xs',
}

type IssuerAvatarProps = {
  displayName: string
  logoUri: string | null
  size?: IssuerAvatarSize
}

export function IssuerAvatar({ displayName, logoUri, size = 'md' }: IssuerAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false)

  const initials = displayName.slice(0, 2).toUpperCase()
  const sizeClass = SIZE_CLASSES[size]

  if (logoUri && !imgFailed) {
    return (
      <img
        src={logoUri}
        alt={`${displayName} logo`}
        className={`${sizeClass} shrink-0 rounded-full object-contain ring-1 ring-slate-200`}
        onError={() => setImgFailed(true)}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-[#4b7c8c] font-bold text-white ring-1 ring-slate-200`}
      aria-hidden
    >
      {initials}
    </div>
  )
}
