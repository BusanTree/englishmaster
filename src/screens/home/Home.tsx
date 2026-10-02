import { ChevronRight, Flame, MessageCircle, Mic } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { GoalRing } from '../../components/GoalRing.tsx'
import { ProgressBar } from '../../components/ProgressBar.tsx'
import { Screen } from '../../components/Screen.tsx'
import { TodayWordsCard } from '../../components/TodayWordsCard.tsx'
import { WeekDots } from '../../components/WeekDots.tsx'
import { COURSES } from '../../content/index.ts'
import { modelLabel } from '../../lib/ai/models.ts'
import { dayKey } from '../../lib/date.ts'
import { formatKoreanDate, greeting } from '../../lib/format.ts'
import { currentStreak, weekCells } from '../../lib/progress.ts'
import { nextLesson } from '../../lib/today.ts'
import { useProgress } from '../../store/progress.ts'
import { useSettings } from '../../store/settings.ts'
import { useTutor } from '../../store/tutor.ts'

export function Home() {
  const [now] = useState(() => new Date())
  const today = dayKey(now)
  const studyDays = useProgress((s) => s.studyDays)
  const xpToday = useProgress((s) => s.xpByDay[today] ?? 0)
  const lessons = useProgress((s) => s.lessons)
  const goal = useSettings((s) => s.dailyGoal)
  const apiKey = useTutor((s) => s.apiKey)
  const model = useTutor((s) => s.model)
  const streak = currentStreak(studyDays, today)
  const next = nextLesson(COURSES, lessons)

  return (
    <Screen tabs>
      <header className="flex items-end justify-between pt-4 pb-5">
        <div>
          <p className="text-sm font-semibold text-muted">{formatKoreanDate(today)}</p>
          <h1 className="mt-1 text-[26px] font-extrabold tracking-tight">{greeting(now.getHours())}</h1>
        </div>
        <div
          aria-label={`연속 학습 ${streak}일`}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[15px] font-extrabold ${
            streak > 0 ? 'bg-flame-soft text-flame-deep' : 'bg-surface text-faint'
          }`}
        >
          <Flame size={18} fill={streak > 0 ? 'currentColor' : 'none'} strokeWidth={streak > 0 ? 0 : 2} aria-hidden />
          {streak}일
        </div>
      </header>

      <TodayWordsCard />

      <section className="mt-6 flex items-center gap-4" aria-label="오늘 목표">
        <GoalRing value={xpToday} goal={goal} />
        <div>
          <p className="text-sm font-semibold text-muted">{xpToday >= goal ? '오늘 목표 달성!' : '오늘 목표'}</p>
          <p className="font-en text-2xl font-extrabold tabular-nums">
            {xpToday} <span className="text-lg text-faint">/ {goal} XP</span>
          </p>
        </div>
      </section>

      <section className="mt-5">
        <WeekDots cells={weekCells(studyDays, today)} />
      </section>

      <nav className="mt-6 divide-y divide-line border-y border-line" aria-label="바로 가기">
        <Link
          to={next ? `/speaking/${next.lesson.id}` : '/speaking'}
          className="flex items-center gap-4 py-4 active:bg-surface"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
            <Mic size={24} strokeWidth={2.4} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            {next ? (
              <>
                <span className="block text-sm text-muted">이어서 말하기</span>
                <span className="block truncate text-[17px] font-bold">{next.lesson.title}</span>
                <span className="mt-2 flex items-center gap-2">
                  <ProgressBar value={next.done / next.course.lessons.length} className="h-2 flex-1" label="코스 진행률" />
                  <span className="shrink-0 text-xs font-semibold text-muted">
                    {next.course.title} {next.done}/{next.course.lessons.length}
                  </span>
                </span>
              </>
            ) : (
              <>
                <span className="block text-sm text-muted">모든 레슨 완료</span>
                <span className="block text-[17px] font-bold">다시 연습해 볼까요?</span>
              </>
            )}
          </span>
          <ChevronRight size={22} className="text-faint" aria-hidden />
        </Link>
        <Link to="/tutor" className="flex items-center gap-4 py-4 active:bg-surface">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
            <MessageCircle size={24} strokeWidth={2.4} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-bold">{apiKey ? 'AI 튜터와 대화하기' : 'AI 튜터 연결하기'}</span>
            <span className="block truncate text-sm text-muted">
              {apiKey ? modelLabel(model) : 'OpenRouter를 연결하면 AI와 영어로 대화해요'}
            </span>
          </span>
          <ChevronRight size={22} className="text-faint" aria-hidden />
        </Link>
      </nav>
    </Screen>
  )
}
