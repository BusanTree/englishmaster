import { Flame } from 'lucide-react'
import { Button } from '../../components/Button.tsx'
import { Celebrate } from '../../components/Feedback.tsx'
import { SpeakerButton } from '../../components/SpeakerButton.tsx'
import { WORD_BY_ID } from '../../content/index.ts'

export function SessionResult({
  accuracy,
  xp,
  streak,
  missed,
  again,
  onHome,
  onAgain,
}: {
  accuracy: number
  xp: number
  streak: number
  missed: string[]
  /** Label of the follow-up session button, or null when nothing is left. */
  again: string | null
  onHome: () => void
  onAgain: () => void
}) {
  const message = accuracy === 100 ? '하나도 안 틀렸어요!' : accuracy >= 70 ? '잘하고 있어요.' : '틀린 단어는 내일 다시 나와요.'
  return (
    <div className="flex flex-1 flex-col">
      <Celebrate />
      <div className="pt-10 text-center">
        <h1 className="text-3xl font-extrabold">학습 완료!</h1>
        <p className="mt-2 text-muted">{message}</p>
      </div>

      <dl className="mt-8 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-good-soft px-2 py-4">
          <dt className="text-xs font-bold text-good-deep">정답률</dt>
          <dd className="mt-1 font-en text-2xl font-extrabold text-good-deep">{accuracy}%</dd>
        </div>
        <div className="rounded-2xl bg-brand-soft px-2 py-4">
          <dt className="text-xs font-bold text-brand">얻은 XP</dt>
          <dd className="mt-1 font-en text-2xl font-extrabold text-brand">+{xp}</dd>
        </div>
        <div className="rounded-2xl bg-flame-soft px-2 py-4">
          <dt className="text-xs font-bold text-flame-deep">연속 학습</dt>
          <dd className="mt-1 flex items-center justify-center gap-1 font-en text-2xl font-extrabold text-flame-deep">
            <Flame size={20} fill="currentColor" strokeWidth={0} aria-hidden />
            {streak}일
          </dd>
        </div>
      </dl>

      {missed.length > 0 && (
        <section className="mt-8" aria-labelledby="missed-title">
          <h2 id="missed-title" className="mb-1 text-lg font-bold">
            다시 볼 단어
          </h2>
          <ul className="divide-y divide-line">
            {missed.map((id) => {
              const w = WORD_BY_ID.get(id)
              if (!w) return null
              return (
                <li key={id} className="flex items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-en text-lg font-extrabold">{w.word}</span>
                    <span className="block truncate text-sm text-muted">{w.meaning}</span>
                  </span>
                  <SpeakerButton text={w.word} />
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className="mt-auto flex flex-col gap-3 pt-8">
        <Button block onClick={onHome}>
          홈으로
        </Button>
        {again && (
          <Button variant="secondary" block onClick={onAgain}>
            {again}
          </Button>
        )}
      </div>
    </div>
  )
}
