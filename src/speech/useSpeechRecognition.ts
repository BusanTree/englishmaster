import { useCallback, useEffect, useRef, useState } from 'react'
import { getRecognitionCtor, Recognizer, type RecognizerError, type RecognizerStatus } from './recognizer.ts'
import { stopSpeaking } from './tts.ts'

export interface SpeechHandlers {
  onFinal: (alternatives: string[]) => void
  onError?: (error: RecognizerError) => void
  onSilence?: () => void
}

export interface SpeechRecognitionState {
  supported: boolean
  status: RecognizerStatus
  interim: string
  start: () => void
  stop: () => void
}

export function useSpeechRecognition(handlers: SpeechHandlers): SpeechRecognitionState {
  const [status, setStatus] = useState<RecognizerStatus>('idle')
  const [interim, setInterim] = useState('')
  const handlersRef = useRef(handlers)
  const recognizerRef = useRef<Recognizer | null>(null)

  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    const recognizer = new Recognizer({
      onStatus: setStatus,
      onInterim: setInterim,
      onFinal: (alternatives) => handlersRef.current.onFinal(alternatives),
      onError: (error) => handlersRef.current.onError?.(error),
      onSilence: () => handlersRef.current.onSilence?.(),
    })
    recognizerRef.current = recognizer
    return () => {
      recognizer.abort()
      recognizerRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    setInterim('')
    stopSpeaking()
    recognizerRef.current?.start()
  }, [])
  const stop = useCallback(() => recognizerRef.current?.stop(), [])

  return { supported: getRecognitionCtor() !== null, status, interim, start, stop }
}
