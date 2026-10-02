// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { exportBackup, importBackup } from './backup.ts'
import { EMPTY_PROGRESS, useProgress } from './progress.ts'
import { DEFAULT_SETTINGS, useSettings } from './settings.ts'
import { MAX_CONVERSATIONS, useTutor, type Conversation } from './tutor.ts'

const conv = (id: string): Conversation => ({
  id,
  kind: 'free',
  refId: 'today',
  title: '오늘 하루',
  startedAt: '2026-10-02T00:00:00.000Z',
  messages: [{ id: `${id}-0`, role: 'ai', text: 'Hi!' }],
  cost: 0,
})

beforeEach(() => {
  localStorage.clear()
  useProgress.setState({ ...EMPTY_PROGRESS })
  useSettings.setState({ ...DEFAULT_SETTINGS })
  useTutor.setState({ apiKey: null, model: 'google/gemini-3.8-flash', conversations: [] })
})

describe('progress store', () => {
  it('records a new word, counts it as new today, and returns XP', () => {
    const xp = useProgress.getState().answerWord('apple', true, '2026-10-02')
    const s = useProgress.getState()
    expect(xp).toBe(2)
    expect(s.words.apple).toMatchObject({ box: 1, due: '2026-10-03' })
    expect(s.newByDay['2026-10-02']).toBe(1)
    expect(s.xpByDay['2026-10-02']).toBe(2)
  })

  it('does not count a review as a new word and gives no XP for a wrong answer', () => {
    useProgress.getState().answerWord('apple', true, '2026-10-02')
    const xp = useProgress.getState().answerWord('apple', false, '2026-10-03')
    const s = useProgress.getState()
    expect(xp).toBe(0)
    expect(s.newByDay['2026-10-03']).toBeUndefined()
    expect(s.words.apple).toMatchObject({ box: 1, wrong: 1 })
  })

  it('writes to the day of each action when the date changes mid-session', () => {
    const { answerWord, markStudied } = useProgress.getState()
    answerWord('apple', true, '2026-10-02')
    answerWord('book', true, '2026-10-03')
    markStudied('2026-10-03')
    markStudied('2026-10-03')
    const s = useProgress.getState()
    expect(s.xpByDay).toEqual({ '2026-10-02': 2, '2026-10-03': 2 })
    expect(s.newByDay).toEqual({ '2026-10-02': 1, '2026-10-03': 1 })
    expect(s.studyDays).toEqual(['2026-10-03'])
  })

  it('keeps the best lesson score and marks the day studied once', () => {
    const { completeLesson } = useProgress.getState()
    completeLesson('daily-1', 70, '2026-10-02')
    completeLesson('daily-1', 90, '2026-10-02')
    completeLesson('daily-1', 60, '2026-10-02')
    const s = useProgress.getState()
    expect(s.lessons['daily-1'].bestScore).toBe(90)
    expect(s.studyDays).toEqual(['2026-10-02'])
    expect(s.xpByDay['2026-10-02']).toBe(60)
  })

  it('persists to localStorage under em:progress', () => {
    useProgress.getState().markStudied('2026-10-02')
    expect(localStorage.getItem('em:progress')).toContain('2026-10-02')
  })
})

describe('tutor store', () => {
  it('keeps the newest conversations first, up to the limit', () => {
    for (let i = 0; i < MAX_CONVERSATIONS + 2; i++) useTutor.getState().start(conv(`c${i}`))
    const list = useTutor.getState().conversations
    expect(list).toHaveLength(MAX_CONVERSATIONS)
    expect(list[0].id).toBe(`c${MAX_CONVERSATIONS + 1}`)
  })

  it('adds messages, corrections, cost, and a summary', () => {
    const t = useTutor.getState()
    t.start(conv('a'))
    t.addMessage('a', { id: 'u1', role: 'user', text: 'I go yesterday' })
    t.setCorrection('a', 'u1', { corrected: 'I went yesterday.', explanationKo: '과거형이에요.' })
    t.addMessage('a', { id: 'a1', role: 'ai', text: 'Where did you go?', textKo: '어디 갔어요?', hints: ['To the park.'] })
    t.addCost('a', 0.001)
    t.addCost('a', 0.002)
    t.finish('a', '2026-10-02T01:00:00.000Z', { goodPoints: ['좋아요'], fixes: [], usefulExpressions: [] })
    const c = useTutor.getState().conversations[0]
    expect(c.messages.map((m) => m.id)).toEqual(['a-0', 'u1', 'a1'])
    expect(c.messages[1].correction).toEqual({ corrected: 'I went yesterday.', explanationKo: '과거형이에요.' })
    expect(c.cost).toBeCloseTo(0.003)
    expect(c.endedAt).toBe('2026-10-02T01:00:00.000Z')
    expect(c.summary?.goodPoints).toEqual(['좋아요'])
  })
})

describe('backup', () => {
  it('exports everything except the API key and restores it', () => {
    useTutor.getState().setApiKey('sk-or-secret')
    useTutor.getState().start(conv('a'))
    useSettings.getState().update({ level: 3, onboarded: true })
    useProgress.getState().answerWord('apple', true, '2026-10-02')
    const file = exportBackup(new Date('2026-10-02T00:00:00Z'))
    expect(JSON.stringify(file)).not.toContain('sk-or-secret')

    useProgress.getState().reset()
    useSettings.getState().reset()
    useTutor.getState().replaceHistory('openai/gpt-6-luna', [])
    importBackup(JSON.parse(JSON.stringify(file)))

    expect(useSettings.getState().level).toBe(3)
    expect(useProgress.getState().words.apple).toBeDefined()
    expect(useTutor.getState().conversations.map((c) => c.id)).toEqual(['a'])
    expect(useTutor.getState().model).toBe('google/gemini-3.8-flash')
    expect(useTutor.getState().apiKey).toBe('sk-or-secret')
  })
})
