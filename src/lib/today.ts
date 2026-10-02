import type { Course, Lesson, Level, Word } from '../content/types.ts'
import { newRemaining } from './progress.ts'
import { dueWords, newWordQueue } from './session.ts'
import type { WordState } from './srs.ts'

export function todayPlan(
  words: readonly Word[],
  states: Readonly<Record<string, WordState>>,
  level: Level,
  newByDay: Readonly<Record<string, number>>,
  newPerDay: number,
  today: string,
): { due: number; fresh: number; moreAvailable: boolean } {
  const unseen = newWordQueue(words, states, level).length
  return {
    due: dueWords(words, states, today).length,
    fresh: Math.min(newRemaining(newByDay, today, newPerDay), unseen),
    moreAvailable: unseen > 0,
  }
}

export function nextLesson(
  courses: readonly Course[],
  lessons: Readonly<Record<string, unknown>>,
): { lesson: Lesson; course: Course; done: number } | null {
  for (const course of courses) {
    const lesson = course.lessons.find((l) => !lessons[l.id])
    if (lesson) return { lesson, course, done: course.lessons.filter((l) => lessons[l.id]).length }
  }
  return null
}
