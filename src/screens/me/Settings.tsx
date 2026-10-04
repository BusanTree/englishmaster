import { Download, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { BackHeader } from '../../components/BackHeader.tsx'
import { Button } from '../../components/Button.tsx'
import { Screen } from '../../components/Screen.tsx'
import { LEVEL_NAMES } from '../../content/index.ts'
import type { Level } from '../../content/types.ts'
import { MODEL_OPTIONS } from '../../lib/ai/models.ts'
import { backupFileName, parseBackup } from '../../lib/backup.ts'
import { dayKey } from '../../lib/date.ts'
import { DAILY_GOALS, NEW_PER_DAY_OPTIONS } from '../../lib/progress.ts'
import { englishVoices, loadVoices } from '../../speech/tts.ts'
import { useSpeak } from '../../speech/useSpeak.ts'
import { exportBackup, importBackup } from '../../store/backup.ts'
import { useProgress } from '../../store/progress.ts'
import { useSettings } from '../../store/settings.ts'
import { useToast } from '../../store/toast.ts'
import { useTutor } from '../../store/tutor.ts'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-bold text-muted">{title}</h2>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  )
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div>
      <p className="mb-2 font-bold">{label}</p>
      <div className="flex gap-1 rounded-2xl bg-surface p-1" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`min-h-10 flex-1 rounded-xl text-sm font-bold ${value === o.value ? 'bg-white text-brand shadow-[0_1px_0_var(--color-line)]' : 'text-muted'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Settings() {
  const navigate = useNavigate()
  const settings = useSettings()
  const apiKey = useTutor((s) => s.apiKey)
  const model = useTutor((s) => s.model)
  const setModel = useTutor((s) => s.setModel)
  const setApiKey = useTutor((s) => s.setApiKey)
  const show = useToast((s) => s.show)
  const say = useSpeak()
  const fileInput = useRef<HTMLInputElement>(null)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const isCustom = !MODEL_OPTIONS.some((m) => m.id === model)
  const [customModel, setCustomModel] = useState(isCustom ? model : '')
  const [customOpen, setCustomOpen] = useState(isCustom)

  useEffect(() => {
    let alive = true
    void loadVoices().then((list) => {
      if (alive) setVoices(englishVoices(list))
    })
    return () => {
      alive = false
    }
  }, [])

  const download = () => {
    const blob = new Blob([JSON.stringify(exportBackup(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = backupFileName(dayKey())
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    show('백업 파일을 내려받았어요')
  }

  const restore = async (file: File) => {
    const parsed = parseBackup(await file.text())
    if (!parsed.ok) return show(parsed.error)
    if (!window.confirm('지금 기록을 백업 파일의 기록으로 바꿀까요?')) return
    importBackup(parsed.backup)
    show('백업을 불러왔어요')
  }

  const resetAll = () => {
    if (!window.confirm('모든 학습 기록과 대화 기록을 지우고 처음부터 시작할까요? OpenRouter 연결은 유지돼요.')) return
    useProgress.getState().reset()
    useTutor.getState().replaceHistory(useTutor.getState().model, [])
    settings.reset()
    navigate('/onboarding', { replace: true })
  }

  return (
    <Screen>
      <BackHeader title="설정" fallback="/me" />

      <Section title="학습">
        <Segmented<Level>
          label="레벨"
          value={settings.level}
          options={([1, 2, 3, 4] as Level[]).map((l) => ({ value: l, label: LEVEL_NAMES[l] }))}
          onChange={(level) => settings.update({ level })}
        />
        <Segmented<number>
          label="하루 목표"
          value={settings.dailyGoal}
          options={DAILY_GOALS.map((g) => ({ value: g, label: `${g} XP` }))}
          onChange={(dailyGoal) => settings.update({ dailyGoal })}
        />
        <Segmented<number>
          label="하루 새 단어"
          value={settings.newPerDay}
          options={NEW_PER_DAY_OPTIONS.map((n) => ({ value: n, label: `${n}개` }))}
          onChange={(newPerDay) => settings.update({ newPerDay })}
        />
      </Section>

      <Section title="발음">
        <div>
          <label htmlFor="rate" className="mb-2 flex items-center justify-between font-bold">
            말하기 속도
            <span className="font-en text-brand">{settings.ttsRate.toFixed(1)}배</span>
          </label>
          <input
            id="rate"
            type="range"
            min={0.7}
            max={1.2}
            step={0.1}
            value={settings.ttsRate}
            onChange={(e) => settings.update({ ttsRate: Math.round(Number(e.target.value) * 10) / 10 })}
            className="w-full accent-[var(--color-brand)]"
          />
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => say('Hello! Nice to meet you.')}>
            미리 듣기
          </Button>
        </div>
        <div>
          <label htmlFor="voice" className="mb-2 block font-bold">
            목소리
          </label>
          <select
            id="voice"
            value={settings.voiceURI ?? ''}
            onChange={(e) => settings.update({ voiceURI: e.target.value || null })}
            className="h-12 w-full rounded-2xl border-2 border-line bg-white px-3 text-base"
          >
            <option value="">자동 선택 (미국 영어)</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
          {voices.length === 0 && <p className="mt-2 text-sm text-muted">이 브라우저에서 고를 수 있는 영어 목소리가 없어요.</p>}
        </div>
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block font-bold">AI 답변 자동 재생</span>
            <span className="block text-sm text-muted">AI 튜터의 답을 바로 읽어 줘요.</span>
          </span>
          <input
            type="checkbox"
            checked={settings.autoPlay}
            onChange={(e) => settings.update({ autoPlay: e.target.checked })}
            className="size-6 accent-[var(--color-brand)]"
          />
        </label>
      </Section>

      <Section title="AI 튜터">
        <div className="flex items-center justify-between gap-3">
          <span>
            <span className="block font-bold">OpenRouter</span>
            <span className={`block text-sm ${apiKey ? 'text-good-deep' : 'text-muted'}`}>{apiKey ? '연결됨' : '연결 안 됨'}</span>
          </span>
          {apiKey ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (!window.confirm('OpenRouter 연결을 해제할까요? 이 폰에 저장된 키가 지워져요.')) return
                setApiKey(null)
                show('연결을 해제했어요')
              }}
            >
              연결 해제
            </Button>
          ) : (
            <Button size="sm" onClick={() => navigate('/tutor/connect')}>
              연결하기
            </Button>
          )}
        </div>
        <div>
          <p className="mb-2 font-bold">모델</p>
          <ul className="flex flex-col gap-2" role="radiogroup" aria-label="AI 모델">
            {MODEL_OPTIONS.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={model === m.id}
                  onClick={() => {
                    setModel(m.id)
                    setCustomOpen(false)
                  }}
                  className={`w-full rounded-2xl border-2 px-4 py-3 text-left ${model === m.id ? 'border-brand bg-brand-soft' : 'border-line'}`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-bold">{m.label}</span>
                    <span className="text-xs text-muted">{m.vendor}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    100만 토큰당 입력 ${m.price.input} 출력 ${m.price.output}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {customOpen ? (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                const id = customModel.trim()
                if (!id.includes('/')) return show('provider/model 형식으로 입력해 주세요')
                setModel(id)
                show('모델을 바꿨어요')
              }}
            >
              <input
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="provider/model-id"
                aria-label="OpenRouter 모델 ID"
                autoCapitalize="off"
                className="h-12 min-w-0 flex-1 rounded-2xl border-2 border-line px-4 font-mono text-sm outline-none focus:border-brand"
              />
              <Button type="submit" size="md">
                적용
              </Button>
            </form>
          ) : (
            <button type="button" onClick={() => setCustomOpen(true)} className="mt-3 text-sm font-bold text-brand">
              모델 ID 직접 입력
            </button>
          )}
        </div>
      </Section>

      <Section title="데이터">
        <div className="flex flex-col gap-2">
          <Button variant="secondary" block onClick={download}>
            <Download size={18} aria-hidden /> 백업 내보내기
          </Button>
          <Button variant="secondary" block onClick={() => fileInput.current?.click()}>
            <Upload size={18} aria-hidden /> 백업 가져오기
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void restore(file)
            }}
          />
          <p className="text-sm text-muted">백업 파일에는 OpenRouter 키가 들어가지 않아요.</p>
        </div>
        <Button variant="ghost" block onClick={resetAll} className="text-bad-deep">
          <Trash2 size={18} aria-hidden /> 모든 기록 초기화
        </Button>
      </Section>

      <p className="mt-10 text-center text-sm text-faint">
        EnglishMaster v0.1.0
        <br />
        개인 학습용 앱
      </p>
    </Screen>
  )
}
