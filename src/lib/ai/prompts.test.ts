import { describe, expect, it } from 'vitest'
import { isSummary, isTutorTurn, toCorrection, tutorSystemPrompt } from './prompts.ts'

describe('tutorSystemPrompt', () => {
  it('includes the level guide and the free-talk topic', () => {
    const p = tutorSystemPrompt(1, { kind: 'free', topic: 'weekend plans' })
    expect(p).toContain('CEFR A2')
    expect(p).toContain('weekend plans')
  })

  it('includes the role-play role and situation', () => {
    const p = tutorSystemPrompt(3, { kind: 'roleplay', role: 'a hotel clerk', situation: 'check-in' })
    expect(p).toContain('a hotel clerk')
    expect(p).toContain('check-in')
  })
})

describe('isTutorTurn', () => {
  const turn = {
    reply: 'Nice!',
    replyKo: '좋아요!',
    correction: { needed: false, corrected: '', explanationKo: '' },
    hints: ['Yes.', 'No.'],
  }

  it('accepts a complete turn', () => {
    expect(isTutorTurn(turn)).toBe(true)
  })

  it('rejects missing or mistyped fields', () => {
    expect(isTutorTurn({ ...turn, reply: '' })).toBe(false)
    expect(isTutorTurn({ ...turn, hints: 'Yes.' })).toBe(false)
    expect(isTutorTurn({ ...turn, correction: null })).toBe(false)
    expect(isTutorTurn(null)).toBe(false)
  })
})

describe('toCorrection', () => {
  it('returns null when no correction is needed', () => {
    expect(toCorrection('I went home.', { needed: false, corrected: '', explanationKo: '' })).toBeNull()
  })

  it('returns null when the "correction" only changes case or punctuation', () => {
    expect(toCorrection('i went home', { needed: true, corrected: 'I went home.', explanationKo: '...' })).toBeNull()
  })

  it('returns real fixes, including English for Korean input', () => {
    expect(toCorrection('I go home yesterday', { needed: true, corrected: 'I went home yesterday.', explanationKo: '과거형이에요.' })).toEqual({
      corrected: 'I went home yesterday.',
      explanationKo: '과거형이에요.',
    })
    expect(toCorrection('집에 갔어요', { needed: true, corrected: 'I went home.', explanationKo: '이렇게 말해요.' })).not.toBeNull()
  })
})

describe('isSummary', () => {
  it('accepts a complete summary and rejects broken ones', () => {
    const ok = {
      goodPoints: ['질문을 잘했어요.'],
      fixes: [{ original: 'I go', corrected: 'I went', explanationKo: '과거형' }],
      usefulExpressions: [{ en: 'Sounds good.', ko: '좋아요.' }],
    }
    expect(isSummary(ok)).toBe(true)
    expect(isSummary({ ...ok, fixes: [{ original: 'I go' }] })).toBe(false)
    expect(isSummary({ ...ok, usefulExpressions: undefined })).toBe(false)
  })
})
