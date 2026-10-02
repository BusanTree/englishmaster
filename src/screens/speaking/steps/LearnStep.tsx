import { Lightbulb } from 'lucide-react'
import { Button } from '../../../components/Button.tsx'
import { SpeakerButton } from '../../../components/SpeakerButton.tsx'
import type { Expression } from '../../../content/types.ts'

export function LearnStep({ expression, onNext }: { expression: Expression; onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <p className="pt-4 text-[15px] font-bold text-brand">표현 익히기</p>
      <div className="flex-1 pt-6">
        <h1 className="font-en text-[30px] font-extrabold leading-tight">{expression.en}</h1>
        <p className="mt-3 text-lg text-muted">{expression.ko}</p>
        <div className="mt-5 flex gap-2">
          <SpeakerButton text={expression.en} label="듣기" autoPlay />
          <SpeakerButton text={expression.en} slow label="천천히" />
        </div>
        {expression.tip && (
          <p className="mt-8 flex gap-2 rounded-2xl bg-note-soft p-4 text-[15px] leading-relaxed text-note">
            <Lightbulb size={20} className="mt-0.5 shrink-0" aria-hidden />
            {expression.tip}
          </p>
        )}
      </div>
      <Button block className="mt-6" onClick={onNext}>
        다음
      </Button>
    </div>
  )
}
