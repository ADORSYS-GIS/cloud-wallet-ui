import type { PropsWithChildren } from 'react'

export function PageContainer({ children }: PropsWithChildren) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10">{children}</main>
  )
}
