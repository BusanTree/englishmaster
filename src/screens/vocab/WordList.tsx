import { Search, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { BackHeader } from '../../components/BackHeader.tsx'
import { Button } from '../../components/Button.tsx'
import { EmptyState } from '../../components/Feedback.tsx'
import { Screen } from '../../components/Screen.tsx'
import { LEVEL_NAMES, POS_LABELS, WORDS } from '../../content/index.ts'
import type { Level } from '../../content/types.ts'
import type { WordState } from '../../lib/srs.ts'
import { useProgress } from '../../store/progress.ts'

type Status = 'all' | 'new' | 'learning' | 'mastered'
const STATUS_LABELS: Record<Status, string> = { all: '전체', new: '새 단어', learning: '학습 중', mastered: '마스터' }
const PAGE = 120

function statusOf(state: WordState | undefined): Exclude<Status, 'all'> {
  if (!state) return 'new'
  return state.mastered ? 'mastered' : 'learning'
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 rounded-full border-2 px-3.5 py-1.5 text-sm font-bold ${
        active ? 'border-brand bg-brand text-white' : 'border-line bg-white text-muted'
      }`}
    >
      {children}
    </button>
  )
}

export function WordList() {
  const [params, setParams] = useSearchParams()
  const states = useProgress((s) => s.words)
  const [limit, setLimit] = useState(PAGE)
  const query = params.get('q') ?? ''
  const level = Number(params.get('level')) as Level | 0
  const status = (params.get('status') as Status | null) ?? 'all'

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
    setLimit(PAGE)
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return WORDS.filter(
      (w) =>
        (!level || w.level === level) &&
        (status === 'all' || statusOf(states[w.id]) === status) &&
        (!q || w.word.toLowerCase().includes(q) || w.meaning.includes(q)),
    )
  }, [query, level, status, states])

  return (
    <Screen>
      <BackHeader title="단어 목록" fallback="/vocab" />
      <label className="flex h-12 items-center gap-2 rounded-2xl border-2 border-line px-3 focus-within:border-brand">
        <Search size={20} className="text-faint" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setParam('q', e.target.value || null)}
          placeholder="영어 단어나 뜻으로 찾기"
          aria-label="단어 검색"
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-faint"
        />
      </label>

      <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="레벨">
        <Chip active={!level} onClick={() => setParam('level', null)}>
          전체 레벨
        </Chip>
        {([1, 2, 3, 4] as Level[]).map((l) => (
          <Chip key={l} active={level === l} onClick={() => setParam('level', String(l))}>
            {LEVEL_NAMES[l]}
          </Chip>
        ))}
      </div>
      <div className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="학습 상태">
        {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
          <Chip key={s} active={status === s} onClick={() => setParam('status', s === 'all' ? null : s)}>
            {STATUS_LABELS[s]}
          </Chip>
        ))}
      </div>

      <p className="mt-4 text-sm font-semibold text-muted">{results.length}개</p>

      {results.length === 0 ? (
        <EmptyState icon={<SearchX size={30} />} title="맞는 단어가 없어요" body="검색어나 필터를 바꿔 보세요." />
      ) : (
        <ul className="divide-y divide-line">
          {results.slice(0, limit).map((w) => {
            const st = statusOf(states[w.id])
            const box = states[w.id]?.box
            return (
              <li key={w.id}>
                <Link to={`/vocab/words/${encodeURIComponent(w.id)}`} className="flex items-center gap-3 py-3 active:bg-surface">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate font-en text-lg font-extrabold">{w.word}</span>
                      <span className="shrink-0 text-xs text-faint">{POS_LABELS[w.pos]}</span>
                    </span>
                    <span className="block truncate text-sm text-muted">{w.meaning}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                      st === 'mastered' ? 'bg-good-soft text-good-deep' : st === 'learning' ? 'bg-brand-soft text-brand' : 'bg-surface text-faint'
                    }`}
                  >
                    {st === 'learning' ? `${box}단계` : STATUS_LABELS[st]}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {results.length > limit && (
        <Button variant="secondary" block className="mt-4" onClick={() => setLimit(limit + PAGE)}>
          더 보기
        </Button>
      )}
    </Screen>
  )
}
