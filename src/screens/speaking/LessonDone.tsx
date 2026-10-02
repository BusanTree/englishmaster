import { Button } from '../../components/Button.tsx'
import { Celebrate } from '../../components/Feedback.tsx'
import type { Lesson } from '../../content/types.ts'

export function LessonDone({
  lesson,
  score,
  xp,
  aiReady,
  onPracticeWithAi,
  onFinish,
}: {
  lesson: Lesson
  score: number
  xp: number
  aiReady: boolean
  onPracticeWithAi: () => void
  onFinish: () => void
}) {
  return (
    <div className="flex flex-1 flex-col">
      <Celebrate />
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-sm font-bold text-muted">{lesson.title}</p>
        <h1 className="mt-1 text-3xl font-extrabold">레슨 완료!</h1>
        <p className="mt-8 font-en text-7xl font-extrabold text-brand tabular-nums">{score}</p>
        <p className="mt-1 font-bold text-muted">점</p>
        <p className="mt-6 rounded-full bg-brand-soft px-4 py-2 font-bold text-brand">+{xp} XP</p>
      </div>
      <div className="flex flex-col gap-3">
        <Button block onClick={onPracticeWithAi}>
          {aiReady ? 'AI와 이 상황 연습하기' : 'AI 튜터 연결하고 연습하기'}
        </Button>
        <Button variant="secondary" block onClick={onFinish}>
          레슨 목록으로
        </Button>
      </div>
    </div>
  )
}
