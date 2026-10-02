export interface RecognitionAlternativeLike {
  transcript: string
}

export interface RecognitionEventLike {
  resultIndex: number
  results: ArrayLike<ArrayLike<RecognitionAlternativeLike> & { isFinal: boolean }>
}

/** The parts of the Web Speech API's SpeechRecognition this app uses. */
export interface RecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  onresult: ((event: RecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

export type RecognitionCtor = new () => RecognitionLike
export type RecognizerStatus = 'idle' | 'listening'
export type RecognizerError = 'not-allowed' | 'no-speech' | 'network' | 'unsupported' | 'other'

export interface RecognizerCallbacks {
  onStatus: (status: RecognizerStatus) => void
  onInterim: (text: string) => void
  onFinal: (alternatives: string[]) => void
  onError: (error: RecognizerError) => void
}

const ERRORS: Record<string, RecognizerError> = {
  'not-allowed': 'not-allowed',
  'service-not-allowed': 'not-allowed',
  'audio-capture': 'not-allowed',
  'no-speech': 'no-speech',
  network: 'network',
}

export function getRecognitionCtor(): RecognitionCtor | null {
  const w = globalThis as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** One-utterance English recognition with interim text and up to three alternatives. */
export class Recognizer {
  private rec: RecognitionLike | null = null
  private readonly ctor: RecognitionCtor | null
  private readonly cb: RecognizerCallbacks

  constructor(callbacks: RecognizerCallbacks, ctor: RecognitionCtor | null = getRecognitionCtor()) {
    this.cb = callbacks
    this.ctor = ctor
  }

  get supported(): boolean {
    return this.ctor !== null
  }

  start(): void {
    if (!this.ctor) {
      this.cb.onError('unsupported')
      return
    }
    this.abort()
    const rec = new this.ctor()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.maxAlternatives = 3
    rec.continuous = false
    let delivered = false
    rec.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          const alternatives = Array.from(result, (alt) => alt.transcript.trim()).filter(Boolean)
          if (alternatives.length && !delivered) {
            delivered = true
            this.cb.onFinal(alternatives)
          }
        } else {
          interim += result[0]?.transcript ?? ''
        }
      }
      if (interim.trim()) this.cb.onInterim(interim.trim())
    }
    rec.onerror = (event) => {
      if (event.error === 'aborted') return
      this.cb.onError(ERRORS[event.error] ?? 'other')
    }
    rec.onend = () => {
      if (this.rec !== rec) return
      this.rec = null
      this.cb.onStatus('idle')
    }
    this.rec = rec
    try {
      rec.start()
      this.cb.onStatus('listening')
    } catch {
      this.rec = null
      this.cb.onStatus('idle')
      this.cb.onError('other')
    }
  }

  /** Stops listening; a final result may still arrive. */
  stop(): void {
    this.rec?.stop()
  }

  /** Stops listening and drops any pending result. */
  abort(): void {
    const rec = this.rec
    if (!rec) return
    this.rec = null
    rec.onresult = null
    rec.onerror = null
    rec.onend = null
    rec.abort()
    this.cb.onStatus('idle')
  }
}
