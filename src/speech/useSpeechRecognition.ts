import { useCallback, useEffect, useRef, useState } from 'react'
import { Recognizer, type RecognizerError, type RecognizerStatus } from './recognizer.ts'
import { stopSpeaking } from './tts.ts'

export interface SpeechRecognitionState {
  supported: boolean
  status: RecognizerStatus
  interim: string
  error: RecognizerError | null
  start: () => void
  stop: () => void
}

export function useSpeechRecognition(onFinal: (alternatives: string[]) => void): SpeechRecognitionState {
  const [status, setStatus] = useState<RecognizerStatus>('idle')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<RecognizerError | null>(null)
  const onFinalRef = useRef(onFinal)
  useEffect(() => {
    onFinalRef.current = onFinal
  }, [onFinal])
  const [recognizer] = useState(
    () =>
      new Recognizer({
        onStatus: setStatus,
        onInterim: setInterim,
        onFinal: (alternatives) => onFinalRef.current(alternatives),
        onError: setError,
      }),
  )
  useEffect(() => () => recognizer.abort(), [recognizer])
  const start = useCallback(() => {
    setError(null)
    setInterim('')
    stopSpeaking()
    recognizer.start()
  }, [recognizer])
  const stop = useCallback(() => recognizer.stop(), [recognizer])
  return { supported: recognizer.supported, status, interim, error, start, stop }
}
