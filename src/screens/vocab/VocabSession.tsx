import { CalendarCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button } from '../../components/Button.tsx'
import { useGoBack } from '../../components/useGoBack.ts'
import { EmptyState } from '../../components/Feedback.tsx'
import { FeedbackSheet } from '../../components/FeedbackSheet.tsx'
import { Screen } from '../../components/Screen.tsx'
import { SessionHeader } from '../../components/SessionHeader.tsx'
import { SpeakerButton } from '../../components/SpeakerButton.tsx'
import { WORD_BY_ID, WORDS } from '../../content/index.ts'
import { dayKey } from '../../lib/date.ts'
import { currentStreak, newRemaining } from '../../lib/progress.ts'
import { saysWord } from '../../lib/scoring.ts'
import { buildSession } from '../../lib/session.ts'
import { todayPlan } from '../../lib/today.ts'
import { answerRun, beginQuestion, nextRun, runSummary, startRun } from '../../lib/vocabRun.ts'
import { useProgress } from '../../store/progress.ts'
import { useSettings } from '../../store/settings.ts'
import { QuizQuestion } from './QuizQuestion.tsx'
import { SessionResult } from './SessionResult.tsx'
import { WordIntro } from './WordIntro.tsx'

const MORE_SIZE = 10

function createSession(more: boolean) {
  const today = dayKey()
  const { words, newByDay } = useProgress.getState()
  const { level, newPerDay } = useSettings.getState()
  const newLimit = more ? MORE_SIZE : newRemaining(newByDay, today, newPerDay)
  return buildSession({ words: WORDS, states: words, level, today, newLimit, size: more ? MORE_SIZE : undefined, rng: Math.random })
}

function SessionRun({ more, onAgain }: { more: boolean; onAgain: (more: boolean) => void }) {
  const navigate = useNavigate()
  const goBack = useGoBack('/vocab')
  const answerWord = useProgress((s) => s.answerWord)
  const markStudied = useProgress((s) => s.markStudied)
  // Subscribed so the result screen re-renders once markStudied has recorded today.
  const studyDays = useProgress((s) => s.studyDays)
  const [run, setRun] = useState(() => startRun(createSession(more)))
  const [picked, setPicked] = useState<number | null>(null)
  const [heard, setHeard] = useState<string | null>(null)
  const [lastXp, setLastXp] = useState(0)
  const [xp, setXp] = useState(0)

  const done = run.phase === 'done'
  useEffect(() => {
    if (done && run.results.length > 0) markStudied(dayKey())
  }, [done, run.results.length, markStudied])

  if (run.items.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon={<CalendarCheck size={30} />}
          title="오늘 학습할 단어가 없어요"
          body="내일 복습할 단어가 기다리고 있어요."
          action={
            <Button block onClick={() => navigate('/', { replace: true })}>
              홈으로
            </Button>
          }
        />
      </Screen>
    )
  }

  if (done) {
    const summary = runSummary(run)
    const { words, newByDay } = useProgress.getState()
    const { level, newPerDay } = useSettings.getState()
    const plan = todayPlan(WORDS, words, level, newByDay, newPerDay, dayKey())
    const again = plan.due + plan.fresh > 0 ? '한 번 더 하기' : plan.moreAvailable ? '새 단어 더 배우기' : null
    return (
      <Screen>
        <SessionResult
          accuracy={summary.accuracy}
          xp={xp}
          streak={currentStreak(studyDays, dayKey())}
          missed={summary.missed}
          again={again}
          onHome={() => navigate('/', { replace: true })}
          onAgain={() => onAgain(plan.due + plan.fresh === 0)}
        />
      </Screen>
    )
  }

  const item = run.items[run.index]
  const word = WORD_BY_ID.get(item.wordId)!

  const answer = (correct: boolean) => {
    if (run.phase !== 'question') return
    const gained = item.isRetry ? 0 : answerWord(item.wordId, correct, dayKey())
    setLastXp(gained)
    setXp((x) => x + gained)
    if (!correct) navigator.vibrate?.(60)
    setRun((r) => answerRun(r, correct))
  }

  const next = () => {
    setPicked(null)
    setHeard(null)
    setRun((r) => nextRun(r))
  }

  const total = run.items.length
  const close = () => {
    if (window.confirm('학습을 그만둘까요? 지금까지 결과는 저장돼요.')) goBack()
  }

  return (
    <Screen>
      <SessionHeader progress={run.index / total} label={`${Math.min(run.index + 1, total)}/${total}`} onClose={close} />
      {run.phase === 'intro' ? (
        <WordIntro key={`intro-${run.index}`} word={word} onNext={() => setRun((r) => beginQuestion(r))} />
      ) : (
        <QuizQuestion
          key={`q-${run.index}`}
          item={item}
          word={word}
          locked={run.phase === 'feedback'}
          picked={picked}
          onPick={(i) => {
            setPicked(i)
            answer(i === item.answer)
          }}
          onSpoken={(alternatives) => {
            setHeard(alternatives[0] ?? '')
            answer(saysWord(alternatives, word.word))
          }}
          onSkip={() => {
            setPicked(-1)
            answer(false)
          }}
        />
      )}

      {run.phase === 'feedback' && (
        <FeedbackSheet
          tone={run.lastCorrect ? 'good' : 'bad'}
          title={run.lastCorrect ? (lastXp ? `정답이에요! +${lastXp} XP` : '정답이에요!') : '아쉬워요'}
          actionLabel="계속"
          onAction={next}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-en text-xl font-extrabold">{word.word}</p>
              <p className="font-semibold">{word.meaning}</p>
              {heard !== null && !run.lastCorrect && <p className="mt-1 text-sm">들린 말: {heard || '(없음)'}</p>}
              <p className="mt-3 font-en font-bold leading-snug">{word.example}</p>
              <p className="text-sm opacity-80">{word.exampleKo}</p>
            </div>
            <SpeakerButton text={word.word} autoPlay />
          </div>
        </FeedbackSheet>
      )}
    </Screen>
  )
}

export function VocabSession() {
  const [params] = useSearchParams()
  const [round, setRound] = useState({ n: 0, more: params.get('more') === '1' })
  return (
    <SessionRun
      key={round.n}
      more={round.more}
      onAgain={(more) => setRound((r) => ({ n: r.n + 1, more }))}
    />
  )
}
