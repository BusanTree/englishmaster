import { Volume2 } from 'lucide-react'
import { Choice, type ChoiceState } from '../../components/Choice.tsx'
import { SpeakerButton } from '../../components/SpeakerButton.tsx'
import { SpeakInput } from '../../components/SpeakInput.tsx'
import { POS_LABELS } from '../../content/index.ts'
import type { Word } from '../../content/types.ts'
import { clozeOf, type QuizItem } from '../../lib/session.ts'
import { useSpeak } from '../../speech/useSpeak.ts'

const PROMPTS: Record<QuizItem['type'], string> = {
  meaning: '알맞은 뜻을 고르세요',
  listen: '듣고 알맞은 뜻을 고르세요',
  reverse: '알맞은 단어를 고르세요',
  cloze: '빈칸에 알맞은 단어를 고르세요',
  speak: '영어로 말해 보세요',
}

function ListenPrompt({ word }: { word: Word }) {
  const say = useSpeak()
  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={() => say(word.word)}
        aria-label="다시 듣기"
        className="grid size-28 place-items-center rounded-full bg-brand text-white border-b-[6px] border-brand-deep active:translate-y-[2px] active:border-b-[3px]"
      >
        <Volume2 size={48} strokeWidth={2.2} />
      </button>
      <SpeakerButton text={word.word} slow label="천천히" autoPlay />
    </div>
  )
}

export function QuizQuestion({
  item,
  word,
  locked,
  picked,
  onPick,
  onSpoken,
  onSkip,
}: {
  item: QuizItem
  word: Word
  /** True while the feedback sheet is showing. */
  locked: boolean
  picked: number | null
  onPick: (index: number) => void
  onSpoken: (alternatives: string[]) => void
  onSkip: () => void
}) {
  const english = item.type === 'reverse' || item.type === 'cloze'
  const stateOf = (i: number): ChoiceState => {
    if (!locked) return 'idle'
    if (i === item.answer) return 'correct'
    return i === picked ? 'wrong' : 'dim'
  }

  return (
    <div className={`flex flex-1 flex-col ${locked ? 'pb-64' : ''}`}>
      <p className="pt-4 text-center text-[15px] font-bold text-muted">{PROMPTS[item.type]}</p>

      <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
        {item.type === 'meaning' && (
          <>
            <h1 className="font-en text-[40px] font-extrabold leading-tight break-words">{word.word}</h1>
            <p className="mt-1 text-sm font-semibold text-muted">{POS_LABELS[word.pos]}</p>
            <SpeakerButton text={word.word} label="듣기" autoPlay className="mt-4" />
          </>
        )}
        {item.type === 'listen' && (locked ? <h1 className="font-en text-[40px] font-extrabold">{word.word}</h1> : <ListenPrompt word={word} />)}
        {(item.type === 'reverse' || item.type === 'speak') && (
          <>
            <h1 className="text-3xl font-extrabold leading-snug">{word.meaning}</h1>
            <p className="mt-1 text-sm font-semibold text-muted">{POS_LABELS[word.pos]}</p>
          </>
        )}
        {item.type === 'cloze' && (
          <>
            <p className="font-en text-2xl font-bold leading-snug">{clozeOf(word.example, word.word)}</p>
            <p className="mt-3 text-muted">{word.exampleKo}</p>
          </>
        )}
        {item.type === 'speak' && (
          <p className="mt-5 rounded-2xl bg-surface px-4 py-3 font-en text-lg font-semibold text-muted">{clozeOf(word.example, word.word)}</p>
        )}
      </div>

      {item.type === 'speak' ? (
        <SpeakInput onResult={onSpoken} disabled={locked} placeholder="영어 단어를 입력하세요" />
      ) : (
        <div className="flex flex-col gap-2.5">
          {item.options.map((option, i) => (
            <Choice key={`${option}-${i}`} label={option} english={english} state={stateOf(i)} onClick={() => onPick(i)} />
          ))}
        </div>
      )}

      {!locked && (
        <button type="button" onClick={onSkip} className="mt-3 self-center py-2 text-sm font-bold text-muted underline-offset-4 active:underline">
          모르겠어요
        </button>
      )}
    </div>
  )
}
