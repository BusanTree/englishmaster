import { shuffle, type Rng } from './random.ts'
import type { QuizItem } from './session.ts'

export type RunPhase = 'intro' | 'question' | 'feedback' | 'done'

export interface RunResult {
  wordId: string
  correct: boolean
  isNew: boolean
  isRetry: boolean
}

export interface RunState {
  items: QuizItem[]
  index: number
  phase: RunPhase
  lastCorrect: boolean | null
  results: RunResult[]
}

function phaseAt(items: QuizItem[], index: number): RunPhase {
  if (index >= items.length) return 'done'
  const item = items[index]
  return item.isNew && !item.isRetry ? 'intro' : 'question'
}

export function startRun(items: QuizItem[]): RunState {
  return { items, index: 0, phase: phaseAt(items, 0), lastCorrect: null, results: [] }
}

export function beginQuestion(state: RunState): RunState {
  return state.phase === 'intro' ? { ...state, phase: 'question' } : state
}

function retryOf(item: QuizItem, rng: Rng): QuizItem {
  if (item.options.length === 0) return { ...item, isRetry: true }
  const right = item.options[item.answer]
  const options = shuffle(item.options, rng)
  return { ...item, options, answer: options.indexOf(right), isRetry: true }
}

/** Records an answer. A wrong first attempt is asked once more at the end of the session. */
export function answerRun(state: RunState, correct: boolean, rng: Rng = Math.random): RunState {
  if (state.phase !== 'question') return state
  const item = state.items[state.index]
  const items = !correct && !item.isRetry ? [...state.items, retryOf(item, rng)] : state.items
  return {
    ...state,
    items,
    phase: 'feedback',
    lastCorrect: correct,
    results: [...state.results, { wordId: item.wordId, correct, isNew: item.isNew, isRetry: item.isRetry }],
  }
}

export function nextRun(state: RunState): RunState {
  if (state.phase !== 'feedback') return state
  const index = state.index + 1
  return { ...state, index, phase: phaseAt(state.items, index), lastCorrect: null }
}

export function runSummary(state: RunState): { total: number; correct: number; accuracy: number; missed: string[] } {
  const first = state.results.filter((r) => !r.isRetry)
  const correct = first.filter((r) => r.correct).length
  return {
    total: first.length,
    correct,
    accuracy: first.length ? Math.round((correct / first.length) * 100) : 0,
    missed: [...new Set(first.filter((r) => !r.correct).map((r) => r.wordId))],
  }
}
