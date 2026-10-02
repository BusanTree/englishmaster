import { ChevronRight, List } from 'lucide-react'
import { Link } from 'react-router'
import { ProgressBar } from '../../components/ProgressBar.tsx'
import { Screen } from '../../components/Screen.tsx'
import { TodayWordsCard } from '../../components/TodayWordsCard.tsx'
import { LEVEL_NAMES, wordsOfLevel } from '../../content/index.ts'
import type { Level } from '../../content/types.ts'
import { wordCounts } from '../../lib/progress.ts'
import { useProgress } from '../../store/progress.ts'
import { useSettings } from '../../store/settings.ts'

const LEVELS: Level[] = [1, 2, 3, 4]

export function VocabHome() {
  const states = useProgress((s) => s.words)
  const current = useSettings((s) => s.level)

  return (
    <Screen tabs>
      <h1 className="pt-4 pb-5 text-[26px] font-extrabold tracking-tight">단어</h1>
      <TodayWordsCard />

      <section className="mt-8" aria-labelledby="levels-title">
        <h2 id="levels-title" className="mb-1 text-lg font-bold">
          레벨별 진도
        </h2>
        <ul className="divide-y divide-line">
          {LEVELS.map((level) => {
            const words = wordsOfLevel(level)
            const c = wordCounts(words, states)
            return (
              <li key={level}>
                <Link to={`/vocab/words?level=${level}`} className="block py-4 active:bg-surface">
                  <span className="flex items-center gap-2">
                    <span className="text-[17px] font-bold">{LEVEL_NAMES[level]}</span>
                    {level === current && (
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">학습 레벨</span>
                    )}
                    <span className="ml-auto text-sm font-semibold text-muted tabular-nums">
                      {c.learning + c.mastered}/{words.length}
                    </span>
                  </span>
                  <ProgressBar value={(c.learning + c.mastered) / words.length} className="mt-2 h-2.5" label={`${LEVEL_NAMES[level]} 진도`} />
                  <span className="mt-2 flex gap-4 text-sm text-muted">
                    <span>학습 중 {c.learning}</span>
                    <span>마스터 {c.mastered}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <Link to="/vocab/words" className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-b-4 border-line px-4 py-3.5 font-bold active:translate-y-[2px] active:border-b-2">
        <List size={22} className="text-brand" aria-hidden />
        <span className="flex-1">전체 단어 목록</span>
        <ChevronRight size={20} className="text-faint" aria-hidden />
      </Link>
    </Screen>
  )
}
