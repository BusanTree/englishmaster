import { describe, expect, it } from 'vitest'
import { applyAnswer, isDue, type WordState } from './srs.ts'

const today = '2026-10-02'
const state = (box: number, extra: Partial<WordState> = {}): WordState => ({
  box,
  due: today,
  correct: 0,
  wrong: 0,
  mastered: false,
  ...extra,
})

describe('applyAnswer', () => {
  it('moves a new word answered correctly to box 1, due tomorrow', () => {
    expect(applyAnswer(undefined, true, today)).toEqual({ box: 1, due: '2026-10-03', correct: 1, wrong: 0, mastered: false })
  })

  it('puts a new word answered wrong in box 1, due tomorrow', () => {
    expect(applyAnswer(undefined, false, today)).toEqual({ box: 1, due: '2026-10-03', correct: 0, wrong: 1, mastered: false })
  })

  it('promotes one box and schedules by the new box interval', () => {
    expect(applyAnswer(state(3), true, today)).toMatchObject({ box: 4, due: '2026-10-09' })
    expect(applyAnswer(state(6), true, today)).toMatchObject({ box: 7, due: '2026-12-01' })
  })

  it('masters a word answered correctly in box 7', () => {
    expect(applyAnswer(state(7, { due: '2026-09-01' }), true, today)).toMatchObject({ box: 7, mastered: true, correct: 1 })
  })

  it('sends a wrong answer back to box 1', () => {
    expect(applyAnswer(state(5, { correct: 4 }), false, today)).toEqual({ box: 1, due: '2026-10-03', correct: 4, wrong: 1, mastered: false })
  })
})

describe('isDue', () => {
  it('is due on or after the due day unless mastered', () => {
    expect(isDue(state(2, { due: today }), today)).toBe(true)
    expect(isDue(state(2, { due: '2026-09-30' }), today)).toBe(true)
    expect(isDue(state(2, { due: '2026-10-03' }), today)).toBe(false)
    expect(isDue(state(7, { mastered: true }), today)).toBe(false)
  })
})
