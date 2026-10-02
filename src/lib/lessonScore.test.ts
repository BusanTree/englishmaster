import { describe, expect, it } from 'vitest'
import { lessonScore } from './lessonScore.ts'

describe('lessonScore', () => {
  it('averages best scores and counts skipped items as zero', () => {
    expect(lessonScore({ 'repeat-0': 100, 'recall-0': 80 }, ['repeat-0', 'recall-0', 'roleplay-1'])).toBe(60)
  })

  it('is zero for no items', () => {
    expect(lessonScore({}, [])).toBe(0)
  })
})
