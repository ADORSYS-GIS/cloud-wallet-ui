import type { ReactNode } from 'react'
import { PageContainer } from '../layout/PageContainer'

type PresentationPageShellProps = {
  title: string
  onBack: () => void
  children: ReactNode
}

/**
 * Shared layout for presentation flow screens — gradient bar header only,
 * without the global PWA Header or bottom navigation.
 */
export function PresentationPageShell({
  title,
  onBack,
  children,
}: PresentationPageShellProps) {
  return (
    <PageContainer fullWidth>
      <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#e9ecef] font-serif">
        <div className="grid grid-cols-[auto_1fr_auto] items-center border-b border-[#96a8b2] bg-gradient-to-r from-[#3f6f7e] to-[#4e7f8f] px-2 py-2">
          <button
            type="button"
            onClick={onBack}
            className="h-10 w-10 rounded-full text-3xl leading-none text-white"
            aria-label="Back"
          >
            ‹
          </button>
          <div className="text-center text-[16px] font-semibold leading-none text-white md:text-[18px]">
            {title}
          </div>
          <div className="w-10" />
        </div>

        {children}
      </div>
    </PageContainer>
  )
}
