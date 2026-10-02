import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { XP } from '../lib/progress.ts'
import { applyAnswer, type WordState } from '../lib/srs.ts'

export interface LessonRecord {
  completedAt: string
  bestScore: number
}

export interface ProgressData {
  words: Record<string, WordState>
  lessons: Record<string, LessonRecord>
  xpByDay: Record<string, number>
  studyDays: string[]
  /** New words introduced per day, for the daily new-word limit. */
  newByDay: Record<string, number>
}

export const EMPTY_PROGRESS: ProgressData = { words: {}, lessons: {}, xpByDay: {}, studyDays: [], newByDay: {} }

interface ProgressStore extends ProgressData {
  /** Applies the first answer to a quiz item and returns the XP earned. */
  answerWord: (wordId: string, correct: boolean, today: string) => number
  addXp: (amount: number, today: string) => void
  markStudied: (today: string) => void
  completeLesson: (lessonId: string, score: number, today: string) => void
  replace: (data: ProgressData) => void
  reset: () => void
}

export function pickProgress(s: ProgressData): ProgressData {
  return { words: s.words, lessons: s.lessons, xpByDay: s.xpByDay, studyDays: s.studyDays, newByDay: s.newByDay }
}

function plusXp(xpByDay: Record<string, number>, today: string, amount: number): Record<string, number> {
  return amount ? { ...xpByDay, [today]: (xpByDay[today] ?? 0) + amount } : xpByDay
}

function withDay(days: string[], today: string): string[] {
  return days.includes(today) ? days : [...days, today]
}

export const useProgress = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...EMPTY_PROGRESS,
      answerWord: (wordId, correct, today) => {
        const prev = get().words[wordId]
        const xp = correct ? XP.wordCorrect : 0
        set((s) => ({
          words: { ...s.words, [wordId]: applyAnswer(prev, correct, today) },
          newByDay: prev ? s.newByDay : { ...s.newByDay, [today]: (s.newByDay[today] ?? 0) + 1 },
          xpByDay: plusXp(s.xpByDay, today, xp),
        }))
        return xp
      },
      addXp: (amount, today) => set((s) => ({ xpByDay: plusXp(s.xpByDay, today, amount) })),
      markStudied: (today) => set((s) => ({ studyDays: withDay(s.studyDays, today) })),
      completeLesson: (lessonId, score, today) =>
        set((s) => ({
          lessons: {
            ...s.lessons,
            [lessonId]: { completedAt: today, bestScore: Math.max(s.lessons[lessonId]?.bestScore ?? 0, score) },
          },
          xpByDay: plusXp(s.xpByDay, today, XP.lessonComplete),
          studyDays: withDay(s.studyDays, today),
        })),
      replace: (data) => set(pickProgress({ ...EMPTY_PROGRESS, ...data })),
      reset: () => set(EMPTY_PROGRESS),
    }),
    { name: 'em:progress', version: 1 },
  ),
)
