import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

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
  const navigate = useNavigate()
  const back = () => {
    if (onBack) return onBack()
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }
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
