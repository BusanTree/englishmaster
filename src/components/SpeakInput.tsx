import { Keyboard, Mic } from 'lucide-react'
import { useState } from 'react'
import { SPEECH_NOTICES } from '../speech/notices.ts'
import { getRecognitionCtor } from '../speech/recognizer.ts'
import { useSpeechRecognition } from '../speech/useSpeechRecognition.ts'
import { Button } from './Button.tsx'
import { MicButton } from './MicButton.tsx'

/**
 * Answer by voice (Chrome speech recognition) or by typing.
 * Calls `onResult` with the recognition alternatives, or with the typed text.
 */
export function SpeakInput({
  onResult,
  disabled = false,
  placeholder = '영어로 입력하세요',
}: {
  onResult: (alternatives: string[]) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [mode, setMode] = useState<'voice' | 'keyboard'>(() => (getRecognitionCtor() ? 'voice' : 'keyboard'))
  const [notice, setNotice] = useState<string | null>(() => (getRecognitionCtor() ? null : SPEECH_NOTICES.unsupported))
  const [text, setText] = useState('')
  const rec = useSpeechRecognition({
    onFinal: onResult,
    onError: (error) => {
      setNotice(SPEECH_NOTICES[error])
      if (error === 'not-allowed' || error === 'unsupported') setMode('keyboard')
    },
    onSilence: () => setNotice(SPEECH_NOTICES['no-speech']),
  })

  const listening = rec.status === 'listening'

  if (mode === 'keyboard') {
    return (
      <form
        className="flex w-full flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          const value = text.trim()
          if (!value || disabled) return
          onResult([value])
          setText('')
        }}
      >
        {notice && <p className="text-sm text-muted">{notice}</p>}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            aria-label="영어 문장 입력"
            className="h-12 min-w-0 flex-1 rounded-2xl border-2 border-line bg-white px-4 font-en text-[17px] font-semibold outline-none placeholder:font-sans placeholder:font-normal placeholder:text-faint focus:border-brand"
          />
          <Button type="submit" size="md" disabled={disabled || !text.trim()}>
            확인
          </Button>
        </div>
        {rec.supported && (
          <button
            type="button"
            onClick={() => {
              setMode('voice')
              setNotice(null)
            }}
            className="inline-flex items-center gap-1.5 self-center py-2 text-sm font-bold text-brand"
          >
            <Mic size={16} aria-hidden /> 말하기로 답하기
          </button>
        )}
      </form>
    )
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <p className="min-h-7 px-2 text-center font-en text-lg font-semibold text-muted" aria-live="polite">
        {listening ? rec.interim || '듣고 있어요…' : notice ?? ''}
      </p>
      <MicButton
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
        className="inline-flex items-center gap-1.5 py-2 text-sm font-bold text-muted"
      >
        <Keyboard size={16} aria-hidden /> 직접 입력
      </button>
    </div>
  )
}
