/** Circular progress toward today's XP goal. */
export function GoalRing({ value, goal, size = 56 }: { value: number; goal: number; size?: number }) {
  const stroke = 7
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const ratio = goal > 0 ? Math.min(1, value / goal) : 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
      {ratio > 0 && <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={ratio >= 1 ? 'var(--color-good)' : 'var(--color-brand)'}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference * ratio} ${circumference}`}
        className="transition-[stroke-dasharray] duration-500"
      />}
    </svg>
  )
}
