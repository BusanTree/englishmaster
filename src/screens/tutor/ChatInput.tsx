import { Keyboard, Lightbulb, Mic, SendHorizontal } from 'lucide-react'
import { useState } from 'react'
import { MicButton } from '../../components/MicButton.tsx'
import { SPEECH_NOTICES } from '../../speech/notices.ts'
import { getRecognitionCtor } from '../../speech/recognizer.ts'
import { useSpeechRecognition } from '../../speech/useSpeechRecognition.ts'

/** Bottom bar of the chat: hint toggle, mic (or text field), and keyboard toggle. */
export function ChatInput({
  disabled,
  hintsOpen,
  onToggleHints,
  onSend,
}: {
  disabled: boolean
  hintsOpen: boolean
  onToggleHints: () => void
  onSend: (text: string) => void
}) {
  const [mode, setMode] = useState<'voice' | 'keyboard'>(() => (getRecognitionCtor() ? 'voice' : 'keyboard'))
  const [notice, setNotice] = useState<string | null>(null)
  const [text, setText] = useState('')
  const rec = useSpeechRecognition({
    onFinal: (alternatives) => onSend(alternatives[0]),
    onError: (error) => {
      setNotice(SPEECH_NOTICES[error])
      if (error === 'not-allowed' || error === 'unsupported') setMode('keyboard')
    },
    onSilence: () => setNotice(SPEECH_NOTICES['no-speech']),
  })
  const listening = rec.status === 'listening'

  const hintButton = (
    <button
      type="button"
      onClick={onToggleHints}
      aria-pressed={hintsOpen}
      className={`flex w-14 flex-col items-center gap-0.5 text-xs font-bold ${hintsOpen ? 'text-note' : 'text-muted'}`}
    >
      <Lightbulb size={22} aria-hidden />
      힌트
    </button>
  )

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white pb-[max(env(safe-area-inset-bottom),12px)]">
      <div className="mx-auto max-w-[480px] px-4 pt-2">
        <p className="min-h-6 text-center font-en text-[15px] font-semibold text-muted" aria-live="polite">
          {listening ? rec.interim || '듣고 있어요…' : notice ?? ''}
        </p>
        {mode === 'voice' ? (
          <div className="flex items-center justify-between pb-1">
            {hintButton}
            <MicButton
              size="md"
              listening={listening}
              disabled={disabled}
              onClick={() => {
                if (listening) return rec.stop()
                setNotice(null)
                rec.start()
              }}
            />
            <button
              type="button"
              onClick={() => {
                rec.stop()
                setMode('keyboard')
              }}
              className="flex w-14 flex-col items-center gap-0.5 text-xs font-bold text-muted"
            >
              <Keyboard size={22} aria-hidden />
              입력
            </button>
          </div>
        ) : (
          <form
            className="flex items-center gap-2 pb-1"
            onSubmit={(e) => {
              e.preventDefault()
              const value = text.trim()
              if (!value || disabled) return
              onSend(value)
              setText('')
            }}
          >
            {hintButton}
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="영어로 입력하세요"
              aria-label="보낼 문장"
              autoCapitalize="off"
              autoCorrect="off"
              enterKeyHint="send"
              className="h-12 min-w-0 flex-1 rounded-2xl border-2 border-line px-4 font-en text-[17px] font-semibold outline-none placeholder:font-sans placeholder:font-normal placeholder:text-faint focus:border-brand"
            />
            <button
              type="submit"
              aria-label="보내기"
              disabled={disabled || !text.trim()}
              className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand text-white disabled:opacity-40"
            >
              <SendHorizontal size={22} />
            </button>
            {getRecognitionCtor() && (
              <button type="button" aria-label="말하기로 바꾸기" onClick={() => setMode('voice')} className="grid size-10 place-items-center text-muted">
                <Mic size={22} />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
