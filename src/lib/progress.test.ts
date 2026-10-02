import { describe, expect, it } from 'vitest'
import type { Word } from '../content/types.ts'
import { addDays } from './date.ts'
import { calendarCells, currentStreak, longestStreak, newRemaining, weekCells, wordCounts } from './progress.ts'

const today = '2026-10-01' // Thursday

describe('currentStreak', () => {
  it('counts back from today', () => {
    expect(currentStreak([addDays(today, -2), addDays(today, -1), today], today)).toBe(3)
  })

  it('keeps yesterday’s streak alive until today ends', () => {
    expect(currentStreak([addDays(today, -2), addDays(today, -1)], today)).toBe(2)
  })

  it('is zero after a missed day', () => {
    expect(currentStreak([addDays(today, -3)], today)).toBe(0)
    expect(currentStreak([], today)).toBe(0)
  })
})

describe('longestStreak', () => {
  it('finds the longest run of consecutive days', () => {
    expect(longestStreak(['2026-01-01', '2026-01-02', '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-05'])).toBe(3)
    expect(longestStreak([])).toBe(0)
  })
})

describe('weekCells', () => {
  it('returns the Monday-first week containing today', () => {
    const cells = weekCells(['2026-09-29'], today)
    expect(cells.map((c) => c.date)).toEqual([
      '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
    ])
    expect(cells[1].studied).toBe(true)
    expect(cells[3].isToday).toBe(true)
    expect(cells.filter((c) => c.isFuture)).toHaveLength(3)
  })
})

describe('calendarCells', () => {
  it('returns whole weeks ending with the current week', () => {
    const weeks = calendarCells([], today, 12)
    expect(weeks).toHaveLength(12)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(weeks[11][3].isToday).toBe(true)
    expect(weeks[0][0].date).toBe('2026-07-13')
  })
})

describe('wordCounts', () => {
  const w = (id: string): Word => ({ id, word: id, pos: 'noun', meaning: '뜻', example: id, exampleKo: '', level: 1 })
  it('splits words into fresh, learning, and mastered', () => {
    const states = {
      a: { box: 2, due: today, correct: 1, wrong: 0, mastered: false },
      b: { box: 7, due: today, correct: 7, wrong: 0, mastered: true },
    }
    expect(wordCounts([w('a'), w('b'), w('c')], states)).toEqual({ fresh: 1, learning: 1, mastered: 1 })
  })
})

describe('newRemaining', () => {
  it('subtracts words already introduced today', () => {
    expect(newRemaining({ [today]: 4 }, today, 10)).toBe(6)
    expect(newRemaining({ [today]: 12 }, today, 10)).toBe(0)
    expect(newRemaining({}, today, 10)).toBe(10)
  })
})
