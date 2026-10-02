import { Button } from '../../components/Button.tsx'
import { SpeakerButton } from '../../components/SpeakerButton.tsx'
import { POS_LABELS } from '../../content/index.ts'
import type { Word } from '../../content/types.ts'

/** Card that introduces a new word before its first quiz. */
export function WordIntro({ word, onNext }: { word: Word; onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 pt-6">
        <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-bold text-brand">새 단어</span>
        <h1 className="mt-4 font-en text-[44px] font-extrabold leading-tight break-words">{word.word}</h1>
        <p className="mt-1 text-sm font-semibold text-muted">{POS_LABELS[word.pos]}</p>
        <div className="mt-4 flex gap-2">
          <SpeakerButton text={word.word} label="듣기" autoPlay />
          <SpeakerButton text={word.word} slow label="천천히" />
        </div>
        <p className="mt-6 text-2xl font-bold">{word.meaning}</p>
        <div className="mt-6 rounded-3xl bg-surface p-5">
          <p className="font-en text-xl font-bold leading-snug">{word.example}</p>
          <p className="mt-2 text-muted">{word.exampleKo}</p>
          <SpeakerButton text={word.example} label="예문 듣기" className="mt-4" />
        </div>
      </div>
      <Button block className="mt-6" onClick={onNext}>
        알겠어요
      </Button>
    </div>
  )
}
