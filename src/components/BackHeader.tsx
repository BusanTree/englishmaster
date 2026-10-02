import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useGoBack } from './useGoBack.ts'

/** Sticky header with a back button; falls back to `fallback` when there is no in-app history. */
export function BackHeader({
  title,
  fallback = '/',
  onBack,
  right,
}: {
  title: string
  fallback?: string
  onBack?: () => void
  right?: ReactNode
}) {
  const goBack = useGoBack(fallback)
  const back = onBack ?? goBack
  return (
    <header className="sticky top-0 z-10 -mx-5 mb-2 flex h-14 items-center gap-1 bg-white/95 px-2 backdrop-blur">
      <button type="button" aria-label="뒤로" onClick={back} className="grid size-11 place-items-center rounded-full active:bg-surface">
        <ChevronLeft size={28} strokeWidth={2.4} />
      </button>
      <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>
      {right}
    </header>
  )
}
