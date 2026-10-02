import { SearchX } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { BackHeader } from '../../components/BackHeader.tsx'
import { Button } from '../../components/Button.tsx'
import { EmptyState } from '../../components/Feedback.tsx'
import { Screen } from '../../components/Screen.tsx'
import { SpeakerButton } from '../../components/SpeakerButton.tsx'
import { LEVEL_NAMES, POS_LABELS, WORD_BY_ID } from '../../content/index.ts'
import { formatMonthDay } from '../../lib/format.ts'
import { useProgress } from '../../store/progress.ts'

export function WordDetail() {
  const { wordId = '' } = useParams()
  const navigate = useNavigate()
  const word = WORD_BY_ID.get(decodeURIComponent(wordId))
  const state = useProgress((s) => (word ? s.words[word.id] : undefined))

  if (!word) {
    return (
      <Screen>
        <BackHeader title="단어" fallback="/vocab/words" />
        <EmptyState
          icon={<SearchX size={30} />}
          title="단어를 찾을 수 없어요"
          action={
            <Button block onClick={() => navigate('/vocab/words', { replace: true })}>
              단어 목록으로
            </Button>
          }
        />
      </Screen>
    )
  }

  return (
    <Screen>
      <BackHeader title="단어" fallback="/vocab/words" />
      <section className="pt-4 pb-6">
        <p className="flex gap-2 text-sm font-semibold text-muted">
          <span>{POS_LABELS[word.pos]}</span>
          <span className="text-faint">{LEVEL_NAMES[word.level]}</span>
        </p>
        <h2 className="mt-1 font-en text-[40px] font-extrabold leading-tight break-words">{word.word}</h2>
        <div className="mt-3 flex gap-2">
          <SpeakerButton text={word.word} label="듣기" autoPlay />
          <SpeakerButton text={word.word} slow label="천천히" />
        </div>
        <p className="mt-5 text-2xl font-bold">{word.meaning}</p>
      </section>

      <section className="rounded-3xl bg-surface p-5" aria-label="예문">
        <p className="font-en text-xl font-bold leading-snug">{word.example}</p>
        <p className="mt-2 text-muted">{word.exampleKo}</p>
        <SpeakerButton text={word.example} label="예문 듣기" className="mt-4" />
      </section>

      <section className="mt-6" aria-label="학습 상태">
        {!state ? (
          <p className="text-muted">아직 배우지 않은 단어예요.</p>
        ) : state.mastered ? (
          <p className="font-bold text-good-deep">마스터한 단어예요.</p>
        ) : (
          <>
            <p className="font-bold">복습 {state.box}단계</p>
            <p className="mt-1 text-muted">다음 복습: {formatMonthDay(state.due)}</p>
          </>
        )}
        {state && (
          <p className="mt-2 flex gap-4 text-sm text-muted">
            <span>맞힘 {state.correct}번</span>
            <span>틀림 {state.wrong}번</span>
          </p>
        )}
      </section>
    </Screen>
  )
}
