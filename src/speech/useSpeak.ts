import { useCallback } from 'react'
import { useSettings } from '../store/settings.ts'
import { speak } from './tts.ts'

export type SpeakFn = (text: string, options?: { slow?: boolean; onEnd?: () => void }) => void

/** speak() with the user's rate and voice; slow plays at 70% of the chosen rate. */
export function useSpeak(): SpeakFn {
  const rate = useSettings((s) => s.ttsRate)
  const voiceURI = useSettings((s) => s.voiceURI)
  return useCallback<SpeakFn>(
    (text, options = {}) => speak(text, { rate: options.slow ? Math.max(0.5, rate * 0.7) : rate, voiceURI, onEnd: options.onEnd }),
    [rate, voiceURI],
  )
}
