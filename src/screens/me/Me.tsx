import { ChevronRight, Settings as SettingsIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Screen } from '../../components/Screen.tsx'
import { StudyCalendar } from '../../components/StudyCalendar.tsx'
import { LESSONS, WORDS } from '../../content/index.ts'
import { dayKey } from '../../lib/date.ts'
import { calendarCells, currentStreak, longestStreak, wordCounts } from '../../lib/progress.ts'
import { useProgress } from '../../store/progress.ts'

function Stat({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div className="rounded-2xl bg-surface px-4 py-3">
      <dt className="text-sm font-semibold text-muted">{label}</dt>
      <dd className="mt-0.5 font-en text-2xl font-extrabold tabular-nums">
        {value}
        {unit && <span className="ml-0.5 font-sans text-base font-bold text-muted">{unit}</span>}
      </dd>
    </div>
  )
}

export function Me() {
  const [today] = useState(() => dayKey())
  const studyDays = useProgress((s) => s.studyDays)
  const xpByDay = useProgress((s) => s.xpByDay)
  const words = useProgress((s) => s.words)
  const lessons = useProgress((s) => s.lessons)
  const counts = wordCounts(WORDS, words)
  const totalXp = Object.values(xpByDay).reduce((a, b) => a + b, 0)
  const doneLessons = LESSONS.filter((l) => lessons[l.id]).length

  return (
    <Screen tabs>
      <h1 className="pt-4 pb-5 text-[26px] font-extrabold tracking-tight">나</h1>

      <dl className="grid grid-cols-2 gap-2">
        <Stat label="연속 학습" value={currentStreak(studyDays, today)} unit="일" />
        <Stat label="최장 연속" value={longestStreak(studyDays)} unit="일" />
        <Stat label="오늘 XP" value={xpByDay[today] ?? 0} />
        <Stat label="총 XP" value={totalXp} />
        <Stat label="마스터한 단어" value={counts.mastered} unit="개" />
        <Stat label="학습 중인 단어" value={counts.learning} unit="개" />
      </dl>
      <p className="mt-3 text-sm font-semibold text-muted">
        완료한 레슨 {doneLessons}/{LESSONS.length}
      </p>

      <section className="mt-8" aria-labelledby="calendar-title">
        <h2 id="calendar-title" className="mb-3 text-lg font-bold">
          학습 달력
        </h2>
        <StudyCalendar weeks={calendarCells(studyDays, today, 12)} />
      </section>

      <Link
        to="/me/settings"
        className="mt-8 flex items-center gap-3 rounded-2xl border-2 border-b-4 border-line px-4 py-3.5 font-bold active:translate-y-[2px] active:border-b-2"
      >
        <SettingsIcon size={22} className="text-brand" aria-hidden />
        <span className="flex-1">설정</span>
        <ChevronRight size={20} className="text-faint" aria-hidden />
      </Link>
    </Screen>
  )
}
