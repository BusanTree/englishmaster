import { ChevronLeft } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/Button.tsx'
import { Screen } from '../../components/Screen.tsx'
import { LEVEL_DESCRIPTIONS, LEVEL_NAMES } from '../../content/index.ts'
import type { Level } from '../../content/types.ts'
import { DAILY_GOALS, NEW_PER_DAY_OPTIONS } from '../../lib/progress.ts'
import { useSettings } from '../../store/settings.ts'

const GOAL_LABELS: Record<number, [string, string]> = {
  30: ['가볍게', '하루 5분쯤'],
  50: ['보통', '하루 10분쯤'],
  100: ['열심히', '하루 20분쯤'],
}

function SelectCard({
  selected,
  onClick,
  label,
  children,
}: {
  selected: boolean
  onClick: () => void
  label?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
      className={`w-full rounded-2xl border-2 border-b-4 px-4 py-3.5 text-left transition-transform duration-75 active:translate-y-[2px] active:border-b-2 ${
        selected ? 'border-brand bg-brand-soft' : 'border-line bg-white'
      }`}
    >
      {children}
    </button>
  )
}

export function Onboarding() {
  const navigate = useNavigate()
  const update = useSettings((s) => s.update)
  const [step, setStep] = useState(0)
  const [level, setLevel] = useState<Level | null>(null)
  const [goal, setGoal] = useState(50)
  const [newPerDay, setNewPerDay] = useState(10)

  const finish = () => {
    update({ level: level ?? 1, dailyGoal: goal, newPerDay, onboarded: true })
    void navigator.storage?.persist?.().catch(() => undefined)
    navigate('/', { replace: true })
  }

  if (step === 0) {
    return (
      <Screen className="text-center">
        <div className="flex flex-1 flex-col items-center justify-center">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="mb-6 size-24 rounded-[28px]" />
          <h1 className="font-en text-4xl font-extrabold tracking-tight">EnglishMaster</h1>
          <p className="mt-3 text-lg text-muted">매일 15분, 말하고 외우는 영어</p>
        </div>
        <Button block onClick={() => setStep(1)}>
          시작하기
        </Button>
      </Screen>
    )
  }

  return (
    <Screen>
      <header className="relative flex h-14 items-center justify-center">
        <button
          type="button"
          aria-label="이전 단계"
          onClick={() => setStep(step - 1)}
          className="absolute left-[-8px] grid size-11 place-items-center rounded-full active:bg-surface"
        >
          <ChevronLeft size={28} strokeWidth={2.4} />
        </button>
        <div className="flex gap-2" aria-label={`${step}/3 단계`}>
          {[1, 2, 3].map((i) => (
            <span key={i} className={`h-2 rounded-full transition-all ${i <= step ? 'w-6 bg-brand' : 'w-2 bg-line'}`} />
          ))}
        </div>
      </header>

      {step === 1 && (
        <section className="mt-4 flex flex-col gap-3">
          <h1 className="mb-3 text-2xl font-bold leading-snug">지금 영어 실력은 어느 정도인가요?</h1>
          {([1, 2, 3, 4] as Level[]).map((l) => (
            <SelectCard key={l} selected={level === l} onClick={() => setLevel(l)}>
              <span className="block text-[17px] font-bold">{LEVEL_NAMES[l]}</span>
              <span className="mt-0.5 block text-sm text-muted">{LEVEL_DESCRIPTIONS[l]}</span>
            </SelectCard>
          ))}
        </section>
      )}

      {step === 2 && (
        <section className="mt-4 flex flex-col gap-3">
          <h1 className="mb-3 text-2xl font-bold leading-snug">하루 목표를 정해요</h1>
          {DAILY_GOALS.map((g) => (
            <SelectCard key={g} selected={goal === g} onClick={() => setGoal(g)}>
              <span className="flex items-baseline justify-between">
                <span className="text-[17px] font-bold">{GOAL_LABELS[g][0]}</span>
                <span className="font-en text-lg font-extrabold text-brand">{g} XP</span>
              </span>
              <span className="mt-0.5 block text-sm text-muted">{GOAL_LABELS[g][1]}</span>
            </SelectCard>
          ))}
        </section>
      )}

      {step === 3 && (
        <section className="mt-4">
          <h1 className="mb-6 text-2xl font-bold leading-snug">하루에 새 단어 몇 개씩 배울까요?</h1>
          <div className="grid grid-cols-4 gap-2">
            {NEW_PER_DAY_OPTIONS.map((n) => (
              <SelectCard key={n} selected={newPerDay === n} onClick={() => setNewPerDay(n)} label={`하루 ${n}개`}>
                <span className="block text-center font-en text-2xl font-extrabold">{n}</span>
              </SelectCard>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">복습할 단어는 이와 별도로 매일 나와요. 나중에 설정에서 바꿀 수 있어요.</p>
        </section>
      )}

      <div className="mt-auto pt-8">
        {step < 3 ? (
          <Button block disabled={step === 1 && level === null} onClick={() => setStep(step + 1)}>
            다음
          </Button>
        ) : (
          <Button block onClick={finish}>
            학습 시작하기
          </Button>
        )}
      </div>
    </Screen>
  )
}
