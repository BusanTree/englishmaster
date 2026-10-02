import { ChevronLeft, PenLine, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Button } from '../../components/Button.tsx'
import { SpeakerButton } from '../../components/SpeakerButton.tsx'
import { AI_ERROR_MESSAGES, AiError } from '../../lib/ai/openrouter.ts'
import { toCorrection } from '../../lib/ai/prompts.ts'
import { requestTutorTurn } from '../../lib/ai/tutor.ts'
import { dayKey } from '../../lib/date.ts'
import { XP } from '../../lib/progress.ts'
import { useSpeak } from '../../speech/useSpeak.ts'
import { useProgress } from '../../store/progress.ts'
import { useSettings } from '../../store/settings.ts'
import { useTutor, type TutorMessage } from '../../store/tutor.ts'
import { ChatInput } from './ChatInput.tsx'
import { contextFor } from './contextFor.ts'
import { appUrl } from './startConversation.ts'

function AiMessage({ message }: { message: TutorMessage }) {
  const [showKo, setShowKo] = useState(false)
  const say = useSpeak()
  return (
    <div className="max-w-[86%] self-start">
      <div className="rounded-3xl rounded-bl-md bg-surface px-4 py-3">
        <p className="font-en text-[17px] font-semibold leading-snug">{message.text}</p>
        {showKo && message.textKo && <p className="mt-1.5 text-sm text-muted">{message.textKo}</p>}
      </div>
      <div className="mt-1 flex gap-4 px-2 text-xs font-bold text-muted">
        <button type="button" onClick={() => say(message.text)} className="flex items-center gap-1 py-1">
          <Volume2 size={14} aria-hidden /> 다시 듣기
        </button>
        {message.textKo && (
          <button type="button" onClick={() => setShowKo(!showKo)} className="py-1">
            {showKo ? '번역 숨기기' : '번역 보기'}
          </button>
        )}
      </div>
    </div>
  )
}

function UserMessage({ message }: { message: TutorMessage }) {
  return (
    <div className="flex max-w-[86%] flex-col items-end self-end">
      <p className="rounded-3xl rounded-br-md bg-brand px-4 py-3 font-en text-[17px] font-semibold leading-snug text-white">{message.text}</p>
      {message.correction && (
        <div className="mt-2 w-full rounded-2xl border border-note/20 bg-note-soft px-4 py-3 text-note">
          <p className="flex items-center gap-1.5 text-xs font-bold">
            <PenLine size={14} aria-hidden /> 더 자연스럽게
          </p>
          <p className="mt-1 font-en text-[17px] font-bold leading-snug">{message.correction.corrected}</p>
          {message.correction.explanationKo && <p className="mt-1 text-sm leading-relaxed">{message.correction.explanationKo}</p>}
          <SpeakerButton text={message.correction.corrected} label="듣기" className="mt-2 min-h-8 border-note/20 text-note" />
        </div>
      )}
    </div>
  )
}

function Typing() {
  return (
    <div className="flex gap-1.5 self-start rounded-3xl rounded-bl-md bg-surface px-5 py-4" aria-label="AI가 답을 쓰는 중">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-2 rounded-full bg-faint animate-dot" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </div>
  )
}

export function TutorChat() {
  const { conversationId = '' } = useParams()
  const navigate = useNavigate()
  const conversation = useTutor((s) => s.conversations.find((c) => c.id === conversationId))
  const apiKey = useTutor((s) => s.apiKey)
  const model = useTutor((s) => s.model)
  const level = useSettings((s) => s.level)
  const autoPlay = useSettings((s) => s.autoPlay)
  const addXp = useProgress((s) => s.addXp)
  const say = useSpeak()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AiError | null>(null)
  const [hintsOpen, setHintsOpen] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const messageCount = conversation?.messages.length ?? 0

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messageCount, busy, error, hintsOpen])

  if (!conversation) return <Navigate to="/tutor" replace />
  const id = conversation.id
  const ended = Boolean(conversation.endedAt)
  const lastAi = [...conversation.messages].reverse().find((m) => m.role === 'ai')

  const request = async (history: TutorMessage[]) => {
    if (!apiKey) return
    const lastUser = [...history].reverse().find((m) => m.role === 'user')
    const tutor = useTutor.getState()
    setBusy(true)
    setError(null)
    try {
      const res = await requestTutorTurn({
        apiKey,
        model,
        appUrl: appUrl(),
        level,
        context: contextFor(conversation),
        history: history.map((m) => ({ role: m.role, text: m.text })),
      })
      if (lastUser) tutor.setCorrection(id, lastUser.id, toCorrection(lastUser.text, res.data.correction))
      tutor.addMessage(id, { id: crypto.randomUUID(), role: 'ai', text: res.data.reply, textKo: res.data.replyKo, hints: res.data.hints })
      tutor.addCost(id, res.cost)
      addXp(XP.tutorTurn, dayKey())
      if (autoPlay) say(res.data.reply)
    } catch (err) {
      setError(err instanceof AiError ? err : new AiError('network', String(err)))
    } finally {
      setBusy(false)
    }
  }

  const send = (text: string) => {
    const value = text.trim()
    if (!value || busy) return
    const message: TutorMessage = { id: crypto.randomUUID(), role: 'user', text: value }
    useTutor.getState().addMessage(id, message)
    setHintsOpen(false)
    void request([...conversation.messages, message])
  }

  const finish = () => {
    if (!conversation.messages.some((m) => m.role === 'user')) {
      useTutor.getState().remove(id)
      navigate('/tutor', { replace: true })
      return
    }
    navigate(`/tutor/summary/${id}`, { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[480px] flex-col px-4 pb-48">
      <header className="sticky top-0 z-10 -mx-4 flex h-14 items-center gap-1 border-b border-line bg-white/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur">
        <button
          type="button"
          aria-label="뒤로"
          onClick={() => navigate('/tutor', { replace: true })}
          className="grid size-11 place-items-center rounded-full active:bg-surface"
        >
          <ChevronLeft size={28} strokeWidth={2.4} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-bold">{conversation.title}</h1>
          <p className="text-xs text-muted">{conversation.kind === 'free' ? '자유 대화' : 'AI 롤플레이'}</p>
        </div>
        {!ended && (
          <button type="button" onClick={finish} className="rounded-full px-3 py-2 text-sm font-bold text-brand active:bg-brand-soft">
            끝내기
          </button>
        )}
      </header>

      <div className="flex flex-col gap-4 pt-5">
        {conversation.messages.map((m) => (m.role === 'ai' ? <AiMessage key={m.id} message={m} /> : <UserMessage key={m.id} message={m} />))}
        {busy && <Typing />}
        {error && (
          <div role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-bad-deep">
            <p className="font-bold">{AI_ERROR_MESSAGES[error.kind]}</p>
            <div className="mt-3 flex gap-2">
              {error.kind === 'auth' ? (
                <Button size="sm" variant="bad" onClick={() => navigate('/tutor/connect')}>
                  다시 연결
                </Button>
              ) : (
                <Button size="sm" variant="bad" onClick={() => void request(conversation.messages)}>
                  다시 보내기
                </Button>
              )}
            </div>
          </div>
        )}
        {!apiKey && !ended && (
          <div className="rounded-2xl bg-surface px-4 py-3">
            <p className="font-bold">AI 튜터가 연결되어 있지 않아요.</p>
            <Button size="sm" className="mt-3" onClick={() => navigate('/tutor/connect')}>
              연결하기
            </Button>
          </div>
        )}
        {ended && (
          <Button block className="mt-4" onClick={() => navigate(`/tutor/summary/${id}`, { replace: true })}>
            요약 보기
          </Button>
        )}
      </div>
      <div ref={end} />

      {!ended && apiKey && (
        <>
          {hintsOpen && (
            <div className="fixed inset-x-0 bottom-40 z-20 mx-auto max-w-[480px] px-4">
              <div className="rounded-2xl border border-note/20 bg-note-soft p-3 text-note">
                <p className="text-xs font-bold">이렇게 말해 볼까요?</p>
                {lastAi?.hints?.length ? (
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {lastAi.hints.map((hint) => (
                      <li key={hint}>
                        <button type="button" onClick={() => say(hint)} className="flex w-full items-center gap-2 text-left font-en font-semibold">
                          <Volume2 size={16} className="shrink-0" aria-hidden />
                          {hint}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm">AI의 첫 질문에 자유롭게 답해 보세요. 짧아도 괜찮아요.</p>
                )}
              </div>
            </div>
          )}
          <ChatInput disabled={busy} hintsOpen={hintsOpen} onToggleHints={() => setHintsOpen(!hintsOpen)} onSend={send} />
        </>
      )}
    </div>
  )
}
