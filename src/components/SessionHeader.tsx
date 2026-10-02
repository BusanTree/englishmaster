import { X } from 'lucide-react'
import { ProgressBar } from './ProgressBar.tsx'

/**
 * Top bar of a full-screen session: close button plus either one progress bar
 * (`progress`) or one bar per step (`segments`, each 0..1).
 */
export function SessionHeader({
  progress,
  segments,
  label,
  onClose,
}: {
  progress?: number
  segments?: number[]
  label?: string
  onClose: () => void
}) {
  return (
    <header className="flex items-center gap-3 py-2">
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-faint active:bg-surface"
      >
        <X size={26} strokeWidth={2.6} />
      </button>
      {segments ? (
        <div className="flex flex-1 gap-1.5">
          {segments.map((value, i) => (
            <ProgressBar key={i} value={value} className="flex-1" />
          ))}
        </div>
      ) : (
        <ProgressBar value={progress ?? 0} className="flex-1" />
      )}
      {label && <span className="min-w-12 shrink-0 text-right text-sm font-bold text-muted tabular-nums">{label}</span>}
    </header>
  )
}
