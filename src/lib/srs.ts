import { addDays } from './date.ts'

/** Days until the next review for boxes 1..7. */
export const INTERVALS = [1, 2, 4, 7, 15, 30, 60] as const
export const MAX_BOX = INTERVALS.length

export interface WordState {
  /** 1..7 once the word has been answered at least once. */
  box: number
  /** Day key of the next review. */
  due: string
  correct: number
  wrong: number
  mastered: boolean
}

export function applyAnswer(prev: WordState | undefined, correct: boolean, today: string): WordState {
  const base: WordState = prev ?? { box: 0, due: today, correct: 0, wrong: 0, mastered: false }
  if (!correct) {
    return { ...base, box: 1, due: addDays(today, INTERVALS[0]), wrong: base.wrong + 1, mastered: false }
  }
  if (base.box >= MAX_BOX) {
    return { ...base, correct: base.correct + 1, mastered: true }
  }
  const box = base.box + 1
  return { ...base, box, due: addDays(today, INTERVALS[box - 1]), correct: base.correct + 1 }
}

export function isDue(state: WordState, today: string): boolean {
  return !state.mastered && state.due <= today
}
