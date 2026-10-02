import { describe, expect, it, vi } from 'vitest'
import { buildTutorMessages, requestTutorTurn, transcript } from './tutor.ts'

describe('buildTutorMessages', () => {
  it('starts with the system prompt and a user turn before the AI opening line', () => {
    const msgs = buildTutorMessages('SYS', [
      { role: 'ai', text: 'Hi! Any plans?' },
      { role: 'user', text: 'I go hiking' },
    ])
    expect(msgs.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user'])
    expect(msgs[0].content).toBe('SYS')
    expect(msgs[3].content).toBe('I go hiking')
  })

  it('keeps only the most recent messages', () => {
    const history = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 === 0 ? ('ai' as const) : ('user' as const), text: `m${i}` }))
    const msgs = buildTutorMessages('SYS', history, 16)
    expect(msgs.at(-1)?.content).toBe('m29')
    expect(msgs.filter((m) => m.content.startsWith('m'))).toHaveLength(16)
  })
})

describe('transcript', () => {
  it('labels tutor and learner lines', () => {
    expect(transcript([{ role: 'ai', text: 'Hi' }, { role: 'user', text: 'Hello' }])).toBe('Tutor: Hi\nLearner: Hello')
  })
})

describe('requestTutorTurn', () => {
  it('uses the model’s reasoning setting and the tutor schema', async () => {
    const turn = { reply: 'Cool!', replyKo: '멋져요!', correction: { needed: false, corrected: '', explanationKo: '' }, hints: ['a', 'b'] }
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(turn) } }], usage: { cost: 0.001 } }), { status: 200 }),
    )
    const res = await requestTutorTurn({
      apiKey: 'k',
      model: 'openai/gpt-6-luna',
      level: 2,
      context: { kind: 'free', topic: 'food' },
      history: [{ role: 'ai', text: 'Hi' }, { role: 'user', text: 'Hello' }],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(res.data.reply).toBe('Cool!')
    const body = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body.reasoning).toEqual({ effort: 'none' })
    expect(body.response_format.json_schema.name).toBe('tutor_turn')
  })
})
