import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { BackHeader } from '../../components/BackHeader.tsx'
import { Button } from '../../components/Button.tsx'
import { Celebrate } from '../../components/Feedback.tsx'
import { Screen } from '../../components/Screen.tsx'
import { SpeakerButton } from '../../components/SpeakerButton.tsx'
import { AI_ERROR_MESSAGES, AiError } from '../../lib/ai/openrouter.ts'
import { requestSummary } from '../../lib/ai/tutor.ts'
import { dayKey } from '../../lib/date.ts'
import { formatUsd, usdToKrw } from '../../lib/format.ts'
import { XP } from '../../lib/progress.ts'
import { useProgress } from '../../store/progress.ts'
import { useTutor } from '../../store/tutor.ts'
import { appUrl } from './startConversation.ts'

export function TutorSummary() {
  const { conversationId = '' } = useParams()
  const navigate = useNavigate()
  const conversation = useTutor((s) => s.conversations.find((c) => c.id === conversationId))
  const apiKey = useTutor((s) => s.apiKey)
  const model = useTutor((s) => s.model)
  const markStudied = useProgress((s) => s.markStudied)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fresh, setFresh] = useState(false)
  const started = useRef(false)

  const summarize = async () => {
    if (!conversation || !apiKey) return
    setLoading(true)
    setError(null)
    try {
      const res = await requestSummary({
        apiKey,
        model,
        appUrl: appUrl(),
        history: conversation.messages.map((m) => ({ role: m.role, text: m.text })),
      })
      const tutor = useTutor.getState()
      tutor.addCost(conversation.id, res.cost)
      tutor.finish(conversation.id, new Date().toISOString(), res.data)
      markStudied(dayKey())
      setFresh(true)
    } catch (err) {
      setError(AI_ERROR_MESSAGES[err instanceof AiError ? err.kind : 'network'])
    } finally {
      setLoading(false)
    }
  }

  const finishWithoutSummary = () => {
    if (!conversation) return
    useTutor.getState().finish(conversation.id, new Date().toISOString())
    markStudied(dayKey())
    setFresh(true)
  }

  useEffect(() => {
    if (started.current || !conversation || conversation.endedAt || !apiKey) return
    started.current = true
    void summarize()
    // Runs once on arrival; summarize reads the latest conversation itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!conversation) return <Navigate to="/tutor" replace />
  const turns = conversation.messages.filter((m) => m.role === 'user').length

  if (!conversation.endedAt) {
    return (
      <Screen>
        <BackHeader title="대화 요약" fallback="/tutor" />
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {loading && (
            <>
              <div className="flex gap-2" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="size-3 rounded-full bg-brand animate-dot" style={{ animationDelay: `${i * 0.18}s` }} />
                ))}
              </div>
              <p className="mt-5 text-lg font-bold">대화를 정리하고 있어요…</p>
            </>
          )}
          {!loading && (error || !apiKey) && (
            <>
              <p className="text-lg font-bold">{error ?? 'AI 튜터가 연결되어 있지 않아 요약을 만들 수 없어요.'}</p>
              <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
                {apiKey && (
                  <Button block onClick={() => void summarize()}>
                    다시 시도
                  </Button>
                )}
                <Button variant="secondary" block onClick={finishWithoutSummary}>
                  요약 없이 끝내기
                </Button>
              </div>
            </>
          )}
        </div>
      </Screen>
    )
  }

  const summary = conversation.summary
  const fixes =
    summary?.fixes ??
    conversation.messages.flatMap((m) =>
      m.role === 'user' && m.correction ? [{ original: m.text, corrected: m.correction.corrected, explanationKo: m.correction.explanationKo }] : [],
    )

  return (
    <Screen>
      {fresh && <Celebrate />}
      <BackHeader title="대화 요약" fallback="/tutor" onBack={() => navigate('/tutor', { replace: true })} />
      <div className="pt-4 text-center">
        <p className="text-sm font-bold text-muted">{conversation.title}</p>
        <h1 className="mt-1 text-3xl font-extrabold">대화 완료!</h1>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-brand-soft px-2 py-3">
          <dt className="text-xs font-bold text-brand">말한 횟수</dt>
          <dd className="mt-1 font-en text-2xl font-extrabold text-brand">{turns}번</dd>
        </div>
        <div className="rounded-2xl bg-good-soft px-2 py-3">
          <dt className="text-xs font-bold text-good-deep">얻은 XP</dt>
          <dd className="mt-1 font-en text-2xl font-extrabold text-good-deep">+{turns * XP.tutorTurn}</dd>
        </div>
        <div className="rounded-2xl bg-surface px-2 py-3">
          <dt className="text-xs font-bold text-muted">비용</dt>
          <dd className="mt-1 font-en text-lg font-extrabold">{formatUsd(conversation.cost)}</dd>
          <dd className="text-xs text-muted">약 {usdToKrw(conversation.cost)}원</dd>
        </div>
      </dl>

      {summary && summary.goodPoints.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">잘한 점</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {summary.goodPoints.map((p) => (
              <li key={p} className="rounded-2xl bg-good-soft px-4 py-3 text-good-deep">
                {p}
              </li>
            ))}
          </ul>
        </section>
      )}

      {fixes.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">고칠 점</h2>
          <ul className="mt-2 flex flex-col gap-3">
            {fixes.map((f, i) => (
              <li key={i} className="rounded-2xl border-2 border-line p-4">
                <p className="font-en text-muted line-through decoration-bad/60">{f.original}</p>
                <p className="mt-1 font-en text-lg font-bold">{f.corrected}</p>
                <p className="mt-1 text-sm text-muted">{f.explanationKo}</p>
                <SpeakerButton text={f.corrected} label="듣기" className="mt-3" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary && summary.usefulExpressions.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">써먹을 표현</h2>
          <ul className="mt-2 divide-y divide-line">
            {summary.usefulExpressions.map((e) => (
              <li key={e.en} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-en font-bold">{e.en}</span>
                  <span className="block text-sm text-muted">{e.ko}</span>
                </span>
                <SpeakerButton text={e.en} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 flex flex-col gap-3">
        <Button block onClick={() => navigate('/tutor', { replace: true })}>
          AI 튜터 홈으로
        </Button>
        <Button variant="secondary" block onClick={() => navigate(`/tutor/chat/${conversation.id}`)}>
          대화 다시 보기
        </Button>
      </div>
    </Screen>
  )
}
