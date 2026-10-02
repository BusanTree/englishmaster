import { Flame } from 'lucide-react'
import type { DayCell } from '../lib/progress.ts'

const LABELS = ['월', '화', '수', '목', '금', '토', '일']

/** Monday-to-Sunday row: a flame on study days, an outline on today. */
export function WeekDots({ cells }: { cells: DayCell[] }) {
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label="이번 주 학습 기록">
      {cells.map((c, i) => (
        <li key={c.date} className="flex flex-col items-center gap-1.5">
          <span className={`text-xs font-semibold ${c.isToday ? 'text-ink' : 'text-faint'}`}>{LABELS[i]}</span>
          <span
            aria-label={`${LABELS[i]}요일 ${c.studied ? '학습함' : '학습 안 함'}`}
            className={`grid size-9 place-items-center rounded-full ${
              c.studied ? 'bg-flame text-white' : c.isToday ? 'border-2 border-dashed border-flame/60' : 'bg-surface'
            }`}
          >
            {c.studied && <Flame size={18} fill="currentColor" strokeWidth={0} />}
          </span>
        </li>
      ))}
    </ol>
  )
}
