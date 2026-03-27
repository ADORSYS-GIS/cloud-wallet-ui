import type { PropsWithChildren } from 'react'

type PageContainerProps = PropsWithChildren<{
  fullWidth?: boolean
}>

export function PageContainer({ children, fullWidth = false }: PageContainerProps) {
  return (
    <main className="min-h-screen w-full bg-[#E9ECEF] px-0 py-0">
      <div
        className={`min-h-screen w-full border-[#d0d6da] bg-[#E9ECEF] shadow-[0_0_0_1px_rgba(0,0,0,0.02)] ${
          fullWidth ? '' : 'mx-auto max-w-[810px]'
        }`}
      >
        {children}
      </div>
    </main>
  )
}
