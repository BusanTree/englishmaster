const FILLS = { brand: 'bg-brand', good: 'bg-good', flame: 'bg-flame' } as const

export function ProgressBar({
  value,
  tone = 'brand',
  className = '',
  label,
}: {
  /** 0..1 */
  value: number
  tone?: keyof typeof FILLS
  className?: string
  label?: string
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-3 overflow-hidden rounded-full bg-line ${className}`}
    >
      <div className={`h-full rounded-full ${FILLS[tone]} transition-[width] duration-300`} style={{ width: `${pct}%` }} />
    </div>
  )
}
