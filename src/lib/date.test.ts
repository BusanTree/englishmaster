import { describe, expect, it } from 'vitest'
import { addDays, dayKey, diffDays, parseDayKey } from './date.ts'

describe('dayKey', () => {
  it('formats a local date with zero padding', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('round-trips through parseDayKey', () => {
    expect(dayKey(parseDayKey('2026-10-02'))).toBe('2026-10-02')
  })
})

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-10-02', 60)).toBe('2026-12-01')
  })
})

describe('diffDays', () => {
  it('counts whole days between keys', () => {
    expect(diffDays('2026-10-01', '2026-10-03')).toBe(2)
    expect(diffDays('2026-10-03', '2026-10-01')).toBe(-2)
    expect(diffDays('2026-12-31', '2027-01-01')).toBe(1)
  })
})
