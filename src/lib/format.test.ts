import { describe, expect, it } from 'vitest'
import { formatKoreanDate, formatMonthDay, formatUsd, greeting, usdToKrw } from './format.ts'

describe('format', () => {
  it('formats a short month-day', () => {
    expect(formatMonthDay('2026-12-01')).toBe('12월 1일')
  })

  it('formats a day key in Korean', () => {
    expect(formatKoreanDate('2026-10-02')).toBe('10월 2일 금요일')
  })

  it('greets by time of day', () => {
    expect(greeting(8)).toBe('좋은 아침이에요')
    expect(greeting(14)).toBe('좋은 오후예요')
    expect(greeting(21)).toBe('좋은 저녁이에요')
    expect(greeting(2)).toBe('늦은 밤이에요')
  })

  it('converts and formats cost', () => {
    expect(usdToKrw(0.0123)).toBe(17)
    expect(formatUsd(0.0123)).toBe('$0.0123')
    expect(formatUsd(1.5)).toBe('$1.50')
  })
})
