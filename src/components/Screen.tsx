import type { ReactNode } from 'react'

/** Page container: phone-width column with safe-area padding; `tabs` leaves room for the tab bar. */
export function Screen({ children, tabs = false, className = '' }: { children: ReactNode; tabs?: boolean; className?: string }) {
  return (
    <div
      className={`mx-auto flex min-h-full w-full max-w-[480px] flex-col px-5 pt-[max(env(safe-area-inset-top),12px)] ${
        tabs ? 'pb-28' : 'pb-[max(env(safe-area-inset-bottom),20px)]'
      } ${className}`}
    >
      {children}
    </div>
  )
}
