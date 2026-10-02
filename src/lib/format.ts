import { parseDayKey } from './date.ts'

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

export function formatKoreanDate(day: string): string {
  const d = parseDayKey(day)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}`
}

export function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return '좋은 아침이에요'
  if (hour >= 12 && hour < 18) return '좋은 오후예요'
  if (hour >= 18 && hour < 24) return '좋은 저녁이에요'
  return '늦은 밤이에요'
}

export const KRW_PER_USD = 1400

export function usdToKrw(usd: number): number {
  return Math.round(usd * KRW_PER_USD)
}

export function formatUsd(usd: number): string {
  return usd >= 1 ? `$${usd.toFixed(2)}` : `$${usd.toFixed(4)}`
}
