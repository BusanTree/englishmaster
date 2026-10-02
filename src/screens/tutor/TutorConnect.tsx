import { KeyRound, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { BackHeader } from '../../components/BackHeader.tsx'
import { Button } from '../../components/Button.tsx'
import { Screen } from '../../components/Screen.tsx'
import { beginOAuth } from '../../lib/ai/oauth.ts'
import { useToast } from '../../store/toast.ts'
import { useTutor } from '../../store/tutor.ts'
import { appUrl } from './startConversation.ts'

export function TutorConnect() {
  const navigate = useNavigate()
  const setApiKey = useTutor((s) => s.setApiKey)
  const show = useToast((s) => s.show)
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)

  const connect = async () => {
    setLeaving(true)
    window.location.assign(await beginOAuth(window.localStorage, appUrl()))
  }

  const save = () => {
    const value = key.trim()
    if (!value) return setError('키를 입력해 주세요.')
    if (!value.startsWith('sk-or-')) return setError('OpenRouter 키는 sk-or-로 시작해요. 다시 확인해 주세요.')
    setApiKey(value)
    show('OpenRouter에 연결됐어요')
    navigate('/tutor', { replace: true })
  }

  return (
    <Screen>
      <BackHeader title="OpenRouter 연결" fallback="/tutor" />
      <p className="mt-2 text-[17px] leading-relaxed">
        OpenRouter 계정으로 연결하면 AI 튜터를 쓸 수 있어요. 키는 이 폰에만 저장돼요.
      </p>
      <Button block className="mt-6" disabled={leaving} onClick={() => void connect()}>
        {leaving ? 'OpenRouter로 이동하는 중…' : 'OpenRouter로 연결'}
      </Button>

      <div className="my-8 flex items-center gap-3 text-sm text-faint" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        또는
        <span className="h-px flex-1 bg-line" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <label htmlFor="api-key" className="flex items-center gap-2 font-bold">
          <KeyRound size={18} className="text-brand" aria-hidden />
          API 키 직접 입력
        </label>
        <input
          id="api-key"
          type="password"
          value={key}
          onChange={(e) => {
            setKey(e.target.value)
            setError(null)
          }}
          placeholder="sk-or-v1-…"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'api-key-error' : undefined}
          className="mt-2 h-12 w-full rounded-2xl border-2 border-line px-4 font-mono text-sm outline-none focus:border-brand"
        />
        {error && (
          <p id="api-key-error" className="mt-2 text-sm font-semibold text-bad-deep">
            {error}
          </p>
        )}
        <Button type="submit" variant="secondary" block className="mt-3">
          키 저장
        </Button>
      </form>

      <div className="mt-8 flex gap-3 rounded-2xl bg-surface p-4 text-sm leading-relaxed text-muted">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-brand" aria-hidden />
        <p>
          대화 내용은 OpenRouter와 선택한 AI 모델 회사로 전송돼요. OpenRouter의 Keys 메뉴에서 이 키에 월 사용 한도를 걸어 두면
          안심이에요.
        </p>
      </div>
    </Screen>
  )
}
