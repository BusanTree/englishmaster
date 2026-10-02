export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

let voices: SpeechSynthesisVoice[] = []
/** Chrome stops firing onend if the utterance is garbage-collected mid-speech. */
let current: SpeechSynthesisUtterance | null = null

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported()) return Promise.resolve([])
  const now = speechSynthesis.getVoices()
  if (now.length) {
    voices = now
    return Promise.resolve(now)
  }
  return new Promise((resolve) => {
    const done = () => {
      voices = speechSynthesis.getVoices()
      resolve(voices)
    }
    speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, 1500)
  })
}

export function englishVoices(list: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return list.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('en'))
}

export function pickVoice(list: SpeechSynthesisVoice[], preferredURI: string | null): SpeechSynthesisVoice | undefined {
  const english = englishVoices(list)
  return (
    english.find((v) => v.voiceURI === preferredURI) ??
    english.find((v) => /en[-_]us/i.test(v.lang) && /google/i.test(v.name)) ??
    english.find((v) => /en[-_]us/i.test(v.lang)) ??
    english[0]
  )
}

export interface SpeakOptions {
  rate?: number
  voiceURI?: string | null
  onEnd?: () => void
}

export function speak(text: string, options: SpeakOptions = {}): void {
  if (!ttsSupported()) {
    options.onEnd?.()
    return
  }
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = options.rate ?? 1
  const voice = pickVoice(voices.length ? voices : speechSynthesis.getVoices(), options.voiceURI ?? null)
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  }
  utterance.onend = () => options.onEnd?.()
  utterance.onerror = () => options.onEnd?.()
  current = utterance
  // Chrome on Android sometimes drops an utterance queued right after cancel().
  setTimeout(() => {
    if (current === utterance) speechSynthesis.speak(utterance)
  }, 60)
}

export function stopSpeaking(): void {
  current = null
  if (ttsSupported()) speechSynthesis.cancel()
}

if (ttsSupported()) void loadVoices()
