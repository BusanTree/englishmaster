import { SearchX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '../../components/Button.tsx'
import { EmptyState } from '../../components/Feedback.tsx'
import { Screen } from '../../components/Screen.tsx'
import { SessionHeader } from '../../components/SessionHeader.tsx'
import { useGoBack } from '../../components/useGoBack.ts'
import { LESSON_BY_ID } from '../../content/index.ts'
import { dayKey } from '../../lib/date.ts'
import { lessonScore } from '../../lib/lessonScore.ts'
import { XP } from '../../lib/progress.ts'
import { PASS, type ScoreResult } from '../../lib/scoring.ts'
import { useProgress } from '../../store/progress.ts'
import { useTutor } from '../../store/tutor.ts'
import { startConversation } from '../tutor/startConversation.ts'
import { LessonDone } from './LessonDone.tsx'
import { LearnStep } from './steps/LearnStep.tsx'
import { RoleplayStep } from './steps/RoleplayStep.tsx'
import { SentencePractice } from './steps/SentencePractice.tsx'

type Step = 'learn' | 'repeat' | 'recall' | 'roleplay' | 'done'
const STEPS: Exclude<Step, 'done'>[] = ['learn', 'repeat', 'recall', 'roleplay']

export function LessonPlayer() {
  const { lessonId = '' } = useParams()
  const lesson = LESSON_BY_ID.get(lessonId)
  const navigate = useNavigate()
  const goBack = useGoBack('/speaking')
  const addXp = useProgress((s) => s.addXp)
  const completeLesson = useProgress((s) => s.completeLesson)
  const apiKey = useTutor((s) => s.apiKey)
  const [step, setStep] = useState<Step>('learn')
  const [index, setIndex] = useState(0)
  const [best, setBest] = useState<Record<string, number>>({})
  const [passed, setPassed] = useState<string[]>([])
  const [lineResults, setLineResults] = useState<Record<number, ScoreResult>>({})
  const recorded = useRef(false)

  const userLines = lesson ? lesson.dialogue.lines.flatMap((line, j) => (line.speaker === 'user' ? [j] : [])) : []
  const keys = lesson
    ? [
        ...lesson.expressions.map((_, i) => `repeat-${i}`),
        ...lesson.expressions.map((_, i) => `recall-${i}`),
        ...userLines.map((j) => `roleplay-${j}`),
      ]
    : []
  const score = lessonScore(best, keys)

  useEffect(() => {
    if (step !== 'done' || !lesson || recorded.current) return
    recorded.current = true
    completeLesson(lesson.id, score, dayKey())
  }, [step, lesson, score, completeLesson])

  if (!lesson) {
    return (
      <Screen>
        <EmptyState
          icon={<SearchX size={30} />}
          title="레슨을 찾을 수 없어요"
          action={
            <Button block onClick={() => navigate('/speaking', { replace: true })}>
              레슨 목록으로
            </Button>
          }
        />
      </Screen>
    )
  }

  const lengths: Record<Exclude<Step, 'done'>, number> = {
    learn: lesson.expressions.length,
    repeat: lesson.expressions.length,
    recall: lesson.expressions.length,
    roleplay: lesson.dialogue.lines.length,
  }

  const record = (key: string, value: number, pass: number) => {
    setBest((b) => ({ ...b, [key]: Math.max(b[key] ?? 0, value) }))
    if (value >= pass && !passed.includes(key)) {
      setPassed((p) => [...p, key])
      addXp(XP.sentencePass, dayKey())
    }
  }

  const advance = () => {
    if (step === 'done') return
    if (index + 1 < lengths[step]) {
      setIndex(index + 1)
      return
    }
    setStep(STEPS[STEPS.indexOf(step) + 1] ?? 'done')
    setIndex(0)
  }

  const close = () => {
    if (window.confirm('레슨을 그만둘까요? 이번 레슨 진행 상황은 저장되지 않아요.')) goBack()
  }

  if (step === 'done') {
    return (
      <Screen>
        <LessonDone
          lesson={lesson}
          score={score}
          xp={passed.length * XP.sentencePass + XP.lessonComplete}
          aiReady={Boolean(apiKey)}
          onPracticeWithAi={() => {
            if (!apiKey) return navigate('/tutor/connect')
            const id = startConversation('roleplay', lesson.id)
            if (id) navigate(`/tutor/chat/${id}`, { replace: true })
          }}
          onFinish={() => navigate('/speaking', { replace: true })}
        />
      </Screen>
    )
  }

  const current = STEPS.indexOf(step)
  const segments = STEPS.map((s, i) => (i < current ? 1 : i === current ? index / lengths[s] : 0))
  const expression = lesson.expressions[index]

  return (
    <Screen>
      <SessionHeader segments={segments} label={`${index + 1}/${lengths[step]}`} onClose={close} />
      {step === 'learn' && <LearnStep key={`learn-${index}`} expression={expression} onNext={advance} />}
      {(step === 'repeat' || step === 'recall') && (
        <SentencePractice
          key={`${step}-${index}`}
          mode={step}
          expression={expression}
          onScore={(value) => record(`${step}-${index}`, value, step === 'repeat' ? PASS.repeat : PASS.recall)}
          onNext={advance}
        />
      )}
      {step === 'roleplay' && (
        <RoleplayStep
          lesson={lesson}
          lineIndex={index}
          results={lineResults}
          onScore={(line, result) => {
            setLineResults((r) => ({ ...r, [line]: result }))
            record(`roleplay-${line}`, result.score, PASS.roleplay)
          }}
          onAdvance={advance}
        />
      )}
    </Screen>
  )
}
