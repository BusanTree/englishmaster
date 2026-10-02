import confetti from 'canvas-confetti'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useToast } from '../store/toast.ts'

export function Toast() {
  const message = useToast((s) => s.message)
  const clear = useToast((s) => s.clear)
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(clear, 2600)
    return () => clearTimeout(timer)
  }, [message, clear])
  if (!message) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),16px)] z-50 flex justify-center px-5">
      <div role="status" className="animate-pop rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white">
        {message}
      </div>
    </div>
  )
}

/** One burst of confetti when mounted (skipped for reduced motion). */
export function Celebrate() {
  useEffect(() => {
    void confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.3 },
      colors: ['#6b4eff', '#17b26a', '#ff8a1f', '#f04461', '#ffd43b'],
      disableForReducedMotion: true,
    })
  }, [])
  return null
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-full bg-brand-soft text-brand">{icon}</div>
      <h2 className="text-xl font-bold">{title}</h2>
      {body && <p className="mt-2 text-muted">{body}</p>}
      {action && <div className="mt-6 w-full max-w-xs">{action}</div>}
    </div>
  )
}
