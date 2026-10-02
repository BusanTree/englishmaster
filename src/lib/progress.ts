import type { Word } from '../content/types.ts'
import { addDays, diffDays, parseDayKey } from './date.ts'
import type { WordState } from './srs.ts'

export const XP = { wordCorrect: 2, sentencePass: 5, lessonComplete: 20, tutorTurn: 3 } as const
export const DAILY_GOALS = [30, 50, 100] as const
export const NEW_PER_DAY_OPTIONS = [5, 10, 15, 20] as const

/** Consecutive study days ending today, or ending yesterday while today is still open. */
export function currentStreak(studyDays: readonly string[], today: string): number {
  const days = new Set(studyDays)
  let cursor = days.has(today) ? today : addDays(today, -1)
  let count = 0
  while (days.has(cursor)) {
    count++
    cursor = addDays(cursor, -1)
  }
  return count
}

export function longestStreak(studyDays: readonly string[]): number {
  const sorted = [...new Set(studyDays)].sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const day of sorted) {
    run = prev !== null && diffDays(prev, day) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = day
  }
  return best
}

export interface DayCell {
  date: string
  studied: boolean
  isToday: boolean
  isFuture: boolean
}

function mondayOf(day: string): string {
  return addDays(day, -((parseDayKey(day).getDay() + 6) % 7))
}

function cell(date: string, studied: Set<string>, today: string): DayCell {
  return { date, studied: studied.has(date), isToday: date === today, isFuture: date > today }
}

/** The Monday-first week that contains today. */
export function weekCells(studyDays: readonly string[], today: string): DayCell[] {
  const set = new Set(studyDays)
  const monday = mondayOf(today)
  return Array.from({ length: 7 }, (_, i) => cell(addDays(monday, i), set, today))
}

/** `weeks` Monday-first weeks, oldest first, ending with the current week. */
export function calendarCells(studyDays: readonly string[], today: string, weeks = 12): DayCell[][] {
  const set = new Set(studyDays)
  const start = addDays(mondayOf(today), -7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => cell(addDays(start, w * 7 + d), set, today)),
  )
}

export function wordCounts(
  words: readonly Word[],
  states: Readonly<Record<string, WordState>>,
): { fresh: number; learning: number; mastered: number } {
  let fresh = 0
  let learning = 0
  let mastered = 0
  for (const w of words) {
    const s = states[w.id]
    if (!s) fresh++
    else if (s.mastered) mastered++
    else learning++
  }
  return { fresh, learning, mastered }
}

export function newRemaining(newByDay: Readonly<Record<string, number>>, today: string, newPerDay: number): number {
  return Math.max(0, newPerDay - (newByDay[today] ?? 0))
}
