import { ChevronDown, ChevronRight, Drama, MessageCircle, PenLine, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Button } from '../../components/Button.tsx'
import { Screen } from '../../components/Screen.tsx'
import { COURSES, TOPICS } from '../../content/index.ts'
import { modelLabel } from '../../lib/ai/models.ts'
import { dayKey } from '../../lib/date.ts'
import { formatMonthDay } from '../../lib/format.ts'
import { useTutor } from '../../store/tutor.ts'
import { startConversation } from './startConversation.ts'

function Pitch() {
  const navigate = useNavigate()
  const points = [
    { Icon: Drama, title: '상황 롤플레이', body: '호텔, 회의, 식당 같은 24가지 상황을 AI와 연기해요.' },
    { Icon: MessageCircle, title: '자유 대화', body: '취미, 여행, 일 이야기로 편하게 수다 떨어요.' },
    { Icon: PenLine, title: '말할 때마다 교정', body: '틀리거나 어색한 문장을 자연스럽게 고쳐 줘요.' },
  ]
  return (
    <>
      <div className="mt-6 flex flex-col items-center text-center">
        <span className="grid size-20 place-items-center rounded-[28px] bg-brand-soft text-brand">
          <Sparkles size={38} strokeWidth={2.2} />
        </span>
        <h2 className="mt-5 text-2xl font-extrabold">AI 튜터와 영어로 대화해요</h2>
      </div>
      <ul className="mt-8 flex flex-col gap-5">
        {points.map(({ Icon, title, body }) => (
          <li key={title} className="flex gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface text-brand">
              <Icon size={22} aria-hidden />
            </span>
            <span>
              <span className="block font-bold">{title}</span>
              <span className="block text-sm text-muted">{body}</span>
            </span>
          </li>
        ))}
      </ul>
      <Button block className="mt-10" onClick={() => navigate('/tutor/connect')}>
        OpenRouter 연결하기
      </Button>
      <p className="mt-3 text-center text-sm text-muted">OpenRouter 계정과 크레딧이 필요해요. 10분 대화에 몇십 원 정도예요.</p>
    </>
  )
}

export function TutorHome() {
  const navigate = useNavigate()
  const apiKey = useTutor((s) => s.apiKey)
  const model = useTutor((s) => s.model)
  const conversations = useTutor((s) => s.conversations)

  const open = (kind: 'free' | 'roleplay', refId: string) => {
    const id = startConversation(kind, refId)
    if (id) navigate(`/tutor/chat/${id}`)
  }

  return (
    <Screen tabs>
      <h1 className="pt-4 text-[26px] font-extrabold tracking-tight">AI 튜터</h1>
      {!apiKey ? (
        <Pitch />
      ) : (
        <>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span>모델: {modelLabel(model)}</span>
            <Link to="/me/settings" className="font-bold text-brand">
              변경
            </Link>
          </p>

          <section className="mt-7" aria-labelledby="free-title">
            <h2 id="free-title" className="text-lg font-bold">
              자유 대화
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => open('free', t.id)}
                  className="rounded-2xl border-2 border-b-4 border-line px-4 py-3.5 text-left font-bold active:translate-y-[2px] active:border-b-2"
                >
                  {t.title}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-8" aria-labelledby="roleplay-title">
            <h2 id="roleplay-title" className="text-lg font-bold">
              상황 롤플레이
            </h2>
            <div className="mt-2 divide-y divide-line border-y border-line">
              {COURSES.map((course) => (
                <details key={course.id} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 font-bold [&::-webkit-details-marker]:hidden">
                    {course.title}
                    <ChevronDown size={20} className="text-faint transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <ul className="pb-3">
                    {course.lessons.map((l) => (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => open('roleplay', l.id)}
                          className="flex w-full items-center justify-between rounded-xl px-2 py-2.5 text-left active:bg-surface"
                        >
                          <span>
                            <span className="block font-semibold">{l.title}</span>
                            <span className="block text-sm text-muted">AI: {l.dialogue.aiRole}</span>
                          </span>
                          <ChevronRight size={18} className="text-faint" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          {conversations.length > 0 && (
            <section className="mt-8" aria-labelledby="history-title">
              <h2 id="history-title" className="text-lg font-bold">
                지난 대화
              </h2>
              <ul className="mt-2 divide-y divide-line">
                {conversations.map((c) => {
                  const turns = c.messages.filter((m) => m.role === 'user').length
                  return (
                    <li key={c.id}>
                      <Link
                        to={c.endedAt ? `/tutor/summary/${c.id}` : `/tutor/chat/${c.id}`}
                        className="flex items-center gap-3 py-3 active:bg-surface"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold">{c.title}</span>
                          <span className="block text-sm text-muted">
                            {formatMonthDay(dayKey(new Date(c.startedAt)))} {turns}번 말함
                          </span>
                        </span>
                        <span className={`shrink-0 text-sm font-bold ${c.endedAt ? 'text-muted' : 'text-brand'}`}>
                          {c.endedAt ? '요약 보기' : '이어서 하기'}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </Screen>
  )
}
