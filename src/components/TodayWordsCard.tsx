import { useNavigate } from 'react-router'
import { WORDS } from '../content/index.ts'
import { dayKey } from '../lib/date.ts'
import { todayPlan } from '../lib/today.ts'
import { useProgress } from '../store/progress.ts'
import { useSettings } from '../store/settings.ts'
import { Button } from './Button.tsx'

/** Today's vocabulary work: due reviews plus new words, or a done state with an optional extra session. */
export function TodayWordsCard() {
  const navigate = useNavigate()
  const words = useProgress((s) => s.words)
  const newByDay = useProgress((s) => s.newByDay)
  const level = useSettings((s) => s.level)
  const newPerDay = useSettings((s) => s.newPerDay)
  const plan = todayPlan(WORDS, words, level, newByDay, newPerDay, dayKey())
  const done = plan.due + plan.fresh === 0

  return (
    <section className="rounded-[28px] bg-brand px-5 pt-5 pb-5 text-white">
      <h2 className="text-[15px] font-bold text-white/80">오늘의 단어</h2>
      {done ? (
        <>
          <p className="mt-2 text-2xl font-extrabold">오늘 단어 완료!</p>
          <p className="mt-1 text-white/80">
            {plan.moreAvailable ? '내일 복습할 단어가 기다리고 있어요.' : '준비된 단어를 모두 배웠어요.'}
          </p>
          {plan.moreAvailable && (
            <Button variant="inverse" block className="mt-5" onClick={() => navigate('/vocab/session?more=1')}>
              새 단어 더 배우기
            </Button>
          )}
        </>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <p className="flex flex-col">
              <span className="font-en text-5xl font-extrabold leading-none tabular-nums">{plan.due}</span>
              <span className="mt-1.5 text-sm text-white/80">복습할 단어</span>
            </p>
            <p className="flex flex-col">
              <span className="font-en text-5xl font-extrabold leading-none tabular-nums">{plan.fresh}</span>
              <span className="mt-1.5 text-sm text-white/80">새 단어</span>
            </p>
          </div>
          <Button variant="inverse" block className="mt-5" onClick={() => navigate('/vocab/session')}>
            학습 시작
          </Button>
        </>
      )}
    </section>
  )
}
