import { parseDayKey } from '../lib/date.ts'
import type { DayCell } from '../lib/progress.ts'

const ROWS = ['월', '', '수', '', '금', '', '일']

/** Weeks as columns, Monday-to-Sunday as rows; study days filled in violet. */
export function StudyCalendar({ weeks }: { weeks: DayCell[][] }) {
  const monthLabels = weeks.map((week, i) => {
    const month = parseDayKey(week[0].date).getMonth()
    const prev = i > 0 ? parseDayKey(weeks[i - 1][0].date).getMonth() : -1
    return month !== prev ? `${month + 1}월` : ''
  })
  return (
    <div aria-label="최근 12주 학습 기록" role="img">
      <div className="ml-6 grid gap-1" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
        {monthLabels.map((label, i) => (
          <span key={i} className="h-4 text-[11px] font-semibold whitespace-nowrap text-muted">
            {label}
          </span>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        <div className="grid w-5 grid-rows-7 gap-1">
          {ROWS.map((r, i) => (
            <span key={i} className="flex aspect-square items-center text-[11px] text-faint">
              {r}
            </span>
          ))}
        </div>
        <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
          {weeks.map((week) => (
            <div key={week[0].date} className="grid grid-rows-7 gap-1">
              {week.map((c) => (
                <span
                  key={c.date}
                  title={c.date}
                  className={`aspect-square rounded-[4px] ${
                    c.isFuture ? 'bg-transparent' : c.studied ? 'bg-brand' : 'bg-surface'
                  } ${c.isToday ? 'ring-2 ring-brand/50 ring-offset-1' : ''}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
