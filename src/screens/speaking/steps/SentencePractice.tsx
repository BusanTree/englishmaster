import { useState } from 'react'
import { Button } from '../../../components/Button.tsx'
import { ScoredSentence } from '../../../components/ScoredSentence.tsx'
import { SpeakerButton } from '../../../components/SpeakerButton.tsx'
import { SpeakInput } from '../../../components/SpeakInput.tsx'
import type { Expression } from '../../../content/types.ts'
import { PASS, scoreSpeech, type ScoreResult } from '../../../lib/scoring.ts'
import { ScoreNote } from './ScoreNote.tsx'

/**
 * repeat: hear the sentence and say it back (pass 80).
 * recall: see the Korean and say it in English (pass 70); the model answer appears after trying.
 */
export function SentencePractice({
  mode,
  expression,
  onScore,
  onNext,
}: {
  mode: 'repeat' | 'recall'
  expression: Expression
  onScore: (score: number) => void
  onNext: () => void
}) {
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [revealed, setRevealed] = useState(false)
  const pass = mode === 'repeat' ? PASS.repeat : PASS.recall
  const answered = result !== null || revealed

  const handleResult = (alternatives: string[]) => {
    const r = scoreSpeech(expression.en, alternatives)
    setResult(r)
    onScore(r.score)
  }

  return (
    <div className="flex flex-1 flex-col">
      <p className="pt-4 text-[15px] font-bold text-brand">{mode === 'repeat' ? '따라 말하기' : '영어로 말하기'}</p>

      <div className="flex-1 pt-6">
        {mode === 'repeat' ? (
          <>
            {result ? (
              <ScoredSentence tokens={result.tokens} className="text-[30px]" />
            ) : (
              <h1 className="font-en text-[30px] font-extrabold leading-tight">{expression.en}</h1>
            )}
            <p className="mt-3 text-lg text-muted">{expression.ko}</p>
            <div className="mt-5 flex gap-2">
              <SpeakerButton text={expression.en} label="듣기" autoPlay />
              <SpeakerButton text={expression.en} slow label="천천히" />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold leading-snug">{expression.ko}</h1>
            {answered && (
              <div className="mt-6 rounded-3xl bg-surface p-5">
                <p className="text-xs font-bold text-muted">모범 답안</p>
                {result ? (
                  <ScoredSentence tokens={result.tokens} className="mt-1 text-2xl" />
                ) : (
                  <p className="mt-1 font-en text-2xl font-extrabold">{expression.en}</p>
                )}
                <SpeakerButton text={expression.en} label="듣기" autoPlay={revealed && !result} className="mt-3" />
              </div>
            )}
          </>
        )}

        {result && (
          <div className="mt-6 flex flex-col gap-2">
            <ScoreNote score={result.score} pass={pass} />
            <p className="text-sm text-muted">
              들린 말: <span className="font-en font-semibold text-ink">{result.heard || '(없음)'}</span>
            </p>
          </div>
        )}
      </div>

      <div className="mt-6">
        {answered ? (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setResult(null)
                setRevealed(false)
              }}
            >
              다시 하기
            </Button>
            <Button className="flex-1" onClick={onNext}>
              다음
            </Button>
          </div>
        ) : (
          <>
            <SpeakInput onResult={handleResult} />
            <div className="mt-1 flex justify-center gap-6">
              {mode === 'recall' && (
                <button type="button" onClick={() => setRevealed(true)} className="py-2 text-sm font-bold text-muted">
                  정답 보기
                </button>
              )}
              <button type="button" onClick={onNext} className="py-2 text-sm font-bold text-muted">
                건너뛰기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
