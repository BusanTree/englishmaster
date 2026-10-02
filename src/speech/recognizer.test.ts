import { beforeEach, describe, expect, it } from 'vitest'
import { Recognizer, type RecognitionLike, type RecognizerCallbacks, type RecognizerError, type RecognizerStatus } from './recognizer.ts'

class FakeRecognition implements RecognitionLike {
  static instances: FakeRecognition[] = []
  lang = ''
  interimResults = false
  maxAlternatives = 1
  continuous = true
  onresult: RecognitionLike['onresult'] = null
  onerror: RecognitionLike['onerror'] = null
  onend: RecognitionLike['onend'] = null
  aborted = false
  stopped = false

  constructor() {
    FakeRecognition.instances.push(this)
  }

  start() {}

  stop() {
    this.stopped = true
  }

  abort() {
    this.aborted = true
  }

  emit(alternatives: string[], isFinal: boolean) {
    const result = Object.assign(alternatives.map((transcript) => ({ transcript })), { isFinal })
    this.onresult?.({ resultIndex: 0, results: [result] })
  }
}

let statuses: RecognizerStatus[]
let interims: string[]
let finals: string[][]
let errors: RecognizerError[]
let callbacks: RecognizerCallbacks

beforeEach(() => {
  FakeRecognition.instances = []
  statuses = []
  interims = []
  finals = []
  errors = []
  callbacks = {
    onStatus: (s) => statuses.push(s),
    onInterim: (t) => interims.push(t),
    onFinal: (a) => finals.push(a),
    onError: (e) => errors.push(e),
  }
})

describe('Recognizer', () => {
  it('reports unsupported browsers', () => {
    const r = new Recognizer(callbacks, null)
    expect(r.supported).toBe(false)
    r.start()
    expect(errors).toEqual(['unsupported'])
  })

  it('configures English recognition with alternatives and starts listening', () => {
    new Recognizer(callbacks, FakeRecognition).start()
    const rec = FakeRecognition.instances[0]
    expect(rec).toMatchObject({ lang: 'en-US', interimResults: true, maxAlternatives: 3, continuous: false })
    expect(statuses).toEqual(['listening'])
  })

  it('streams interim text, delivers the final alternatives once, then goes idle', () => {
    new Recognizer(callbacks, FakeRecognition).start()
    const rec = FakeRecognition.instances[0]
    rec.emit(['hello wor'], false)
    rec.emit(['hello world', 'hello word'], true)
    rec.emit(['hello world again'], true)
    rec.onend?.()
    expect(interims).toEqual(['hello wor'])
    expect(finals).toEqual([['hello world', 'hello word']])
    expect(statuses).toEqual(['listening', 'idle'])
  })

  it('goes idle without a result when nothing was heard', () => {
    new Recognizer(callbacks, FakeRecognition).start()
    FakeRecognition.instances[0].onend?.()
    expect(finals).toEqual([])
    expect(statuses).toEqual(['listening', 'idle'])
  })

  it('reports silence when a session ends with no result and no error', () => {
    let silences = 0
    new Recognizer({ ...callbacks, onSilence: () => silences++ }, FakeRecognition).start()
    FakeRecognition.instances[0].onend?.()
    expect(silences).toBe(1)
  })

  it('does not report silence after a result or an error', () => {
    let silences = 0
    const r = new Recognizer({ ...callbacks, onSilence: () => silences++ }, FakeRecognition)
    r.start()
    FakeRecognition.instances[0].emit(['hello'], true)
    FakeRecognition.instances[0].onend?.()
    r.start()
    FakeRecognition.instances[1].onerror?.({ error: 'no-speech' })
    FakeRecognition.instances[1].onend?.()
    expect(silences).toBe(0)
  })

  it('maps browser errors and ignores aborts', () => {
    new Recognizer(callbacks, FakeRecognition).start()
    const rec = FakeRecognition.instances[0]
    rec.onerror?.({ error: 'not-allowed' })
    rec.onerror?.({ error: 'aborted' })
    rec.onerror?.({ error: 'no-speech' })
    rec.onerror?.({ error: 'weird' })
    expect(errors).toEqual(['not-allowed', 'no-speech', 'other'])
  })

  it('abandons the previous session when started twice', () => {
    const r = new Recognizer(callbacks, FakeRecognition)
    r.start()
    r.start()
    const [first, second] = FakeRecognition.instances
    expect(first.aborted).toBe(true)
    first.emit(['old'], true)
    second.emit(['new'], true)
    expect(finals).toEqual([['new']])
  })
})
