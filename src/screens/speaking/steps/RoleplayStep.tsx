import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../components/Button.tsx'
import { ScoredSentence } from '../../../components/ScoredSentence.tsx'
import { SpeakerButton } from '../../../components/SpeakerButton.tsx'
import { SpeakInput } from '../../../components/SpeakInput.tsx'
import type { DialogueLine, Lesson } from '../../../content/types.ts'
import { PASS, scoreSpeech, type ScoreResult } from '../../../lib/scoring.ts'
import { ScoreNote } from './ScoreNote.tsx'

function AiBubble({ line, current }: { line: DialogueLine; current: boolean }) {
  const [showKo, setShowKo] = useState(false)
  return (
    <div className="max-w-[85%] self-start">
      <div className="rounded-3xl rounded-bl-md bg-surface px-4 py-3">
        <p className="font-en text-lg font-bold leading-snug">{line.en}</p>
        {showKo && <p className="mt-1 text-sm text-muted">{line.ko}</p>}
      </div>
      <div className="mt-1 flex gap-3 px-1 text-xs font-bold text-muted">
        <SpeakerButton text={line.en} autoPlay={current} className="min-h-8 border-0 bg-transparent px-0 text-xs" label="다시 듣기" />
        <button type="button" onClick={() => setShowKo(!showKo)}>
          {showKo ? '번역 숨기기' : '번역 보기'}
        </button>
      </div>
    </div>
  )
}

function UserBubble({ line, result }: { line: DialogueLine; result?: ScoreResult }) {
  return (
    <div className="max-w-[85%] self-end rounded-3xl rounded-br-md border-2 border-brand/20 bg-brand-soft px-4 py-3">
      {result ? (
        <ScoredSentence tokens={result.tokens} className="text-lg" />
      ) : (
        <p className="font-en text-lg font-bold leading-snug text-brand">{line.en}</p>
      )}
    </div>
  )
}

function CurrentUserLine({
  line,
  onScore,
  onNext,
}: {
  line: DialogueLine
  onScore: (result: ScoreResult) => void
  onNext: () => void
}) {
  const [attempt, setAttempt] = useState<ScoreResult | null>(null)
  const [showEn, setShowEn] = useState(false)

  if (attempt) {
    return (
      <>
        <UserBubble line={line} result={attempt} />
        <div className="mt-4 flex flex-col gap-3">
          <ScoreNote score={attempt.score} pass={PASS.roleplay} />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setAttempt(null)}>
              다시 하기
            </Button>
            <Button className="flex-1" onClick={onNext}>
              다음
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="mt-2 rounded-3xl border-2 border-dashed border-brand/40 p-4">
      <p className="text-xs font-bold text-brand">내 차례</p>
      <p className="mt-1 text-lg font-bold">{line.ko}</p>
      {showEn ? (
        <p className="mt-2 font-en text-lg font-bold text-muted">{line.en}</p>
      ) : (
        <button type="button" onClick={() => setShowEn(true)} className="mt-2 text-sm font-bold text-brand">
          영어 보기
        </button>
      )}
      <div className="mt-4">
        <SpeakInput
          onResult={(alternatives) => {
            const r = scoreSpeech(line.en, alternatives)
            setAttempt(r)
            onScore(r)
          }}
        />
      </div>
      <button type="button" onClick={onNext} className="mt-1 w-full py-2 text-sm font-bold text-muted">
        건너뛰기
      </button>
    </div>
  )
}

export function RoleplayStep({
  lesson,
  lineIndex,
  results,
  onScore,
  onAdvance,
}: {
  lesson: Lesson
  lineIndex: number
  results: Record<number, ScoreResult>
  onScore: (line: number, result: ScoreResult) => void
  onAdvance: () => void
}) {
  const end = useRef<HTMLDivElement>(null)
  const lines = lesson.dialogue.lines
  const current = lines[lineIndex]

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [lineIndex])

  return (
    <div className="flex flex-1 flex-col">
      <p className="pt-4 text-[15px] font-bold text-brand">대본 롤플레이</p>
      <p className="mt-2 text-muted">{lesson.dialogue.setting}</p>
      <p className="mt-1 flex gap-4 text-sm font-semibold">
        <span>상대: {lesson.dialogue.aiRole}</span>
        <span className="text-brand">나: {lesson.dialogue.userRole}</span>
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {lines.slice(0, lineIndex).map((line, j) =>
          line.speaker === 'ai' ? <AiBubble key={j} line={line} current={false} /> : <UserBubble key={j} line={line} result={results[j]} />,
        )}
        {current.speaker === 'ai' ? (
          <>
            <AiBubble key={lineIndex} line={current} current />
            <Button block className="mt-4" onClick={onAdvance}>
              다음 대사
            </Button>
          </>
        ) : (
          <CurrentUserLine key={lineIndex} line={current} onScore={(r) => onScore(lineIndex, r)} onNext={onAdvance} />
        )}
      </div>
      <div ref={end} />
    </div>
  )
}
