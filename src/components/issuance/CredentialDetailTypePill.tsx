import React from 'react'

type CredentialTypePillProps = {
  name: string
  backgroundColor?: string
  textColor?: string
  format: string
  description?: string
}

export function CredentialTypePill({
  name,
  backgroundColor,
  textColor,
  format,
  description,
}: CredentialTypePillProps) {
  const bg = backgroundColor ?? '#4b7c8c'
  const fg = textColor ?? '#ffffff'

  return (
    <div
      className="w-full px-4 py-3 bg-[var(--pill-bg)] text-[color:var(--pill-fg)]"
      style={{ '--pill-bg': bg, '--pill-fg': fg } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold leading-snug">{name}</span>
        <span className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-medium opacity-70 bg-black/20">
          {format}
        </span>
      </div>
      {description && (
        <p className="mt-1 text-xs leading-snug opacity-80">{description}</p>
      )}
    </div>
  )
}
