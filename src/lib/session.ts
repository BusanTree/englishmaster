import type { Level, Word } from '../content/types.ts'
import { pick, shuffle, type Rng } from './random.ts'
import { isDue, type WordState } from './srs.ts'

export type QuizType = 'meaning' | 'listen' | 'reverse' | 'cloze' | 'speak'

export interface QuizItem {
  wordId: string
  type: QuizType
  /** Four choices: Korean meanings for meaning/listen, English words for reverse/cloze, empty for speak. */
  options: string[]
  /** Index of the right option, -1 for speak. */
  answer: number
  isNew: boolean
  isRetry: boolean
}

export const SESSION_SIZE = 15

const TYPES_BY_BOX: Record<number, QuizType[]> = {
  1: ['meaning', 'listen'],
  2: ['listen', 'reverse'],
  3: ['reverse', 'cloze'],
  4: ['cloze', 'speak'],
  5: ['speak', 'cloze', 'reverse'],
  6: ['speak', 'cloze', 'reverse'],
  7: ['speak', 'cloze', 'reverse'],
}

export function quizTypeFor(box: number, isNew: boolean, rng: Rng): QuizType {
  if (isNew || box < 1) return 'meaning'
  return pick(TYPES_BY_BOX[Math.min(box, 7)], rng)
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** The example sentence with the exact headword replaced by a blank. */
export function clozeOf(example: string, word: string): string {
  return example.replace(new RegExp(`(^|[^A-Za-z])${escapeRegExp(word)}(?=[^A-Za-z]|$)`, 'i'), '$1____')
}

function senses(meaning: string): string[] {
  return meaning.split(',').map((s) => s.trim()).filter(Boolean)
}

/** True when two words share a Korean sense, so one would also be a right answer for the other. */
export function sharesSense(a: Word, b: Word): boolean {
  const mine = new Set(senses(a.meaning))
  return senses(b.meaning).some((s) => mine.has(s))
}

function distractors(word: Word, pool: readonly Word[], rng: Rng, field: 'meaning' | 'word'): string[] {
  const usable = pool.filter((w) => w.id !== word.id && !sharesSense(w, word))
  const sameLevel = usable.filter((w) => w.level === word.level)
  const tiers = [sameLevel.filter((w) => w.pos === word.pos), sameLevel, usable]
  const seen = new Set<string>([word[field]])
  const out: string[] = []
  for (const tier of tiers) {
    for (const w of shuffle(tier, rng)) {
      if (out.length === 3) return out
      if (seen.has(w[field])) continue
      seen.add(w[field])
      out.push(w[field])
    }
  }
  return out
}

export function makeQuiz(word: Word, type: QuizType, pool: readonly Word[], rng: Rng, isNew = false): QuizItem {
  if (type === 'speak') return { wordId: word.id, type, options: [], answer: -1, isNew, isRetry: false }
  const field = type === 'meaning' || type === 'listen' ? 'meaning' : 'word'
  const options = shuffle([word[field], ...distractors(word, pool, rng, field)], rng)
  return { wordId: word.id, type, options, answer: options.indexOf(word[field]), isNew, isRetry: false }
}

type States = Readonly<Record<string, WordState>>

/** Unseen words in study order: the chosen level, then higher levels, then lower ones. */
export function newWordQueue(words: readonly Word[], states: States, level: Level): Word[] {
  const levels = [1, 2, 3, 4]
  const order = [level, ...levels.filter((l) => l > level), ...levels.filter((l) => l < level)]
  return order.flatMap((l) => words.filter((w) => w.level === l && !states[w.id]))
}

export function dueWords(words: readonly Word[], states: States, today: string): Word[] {
  return words
    .filter((w) => states[w.id] !== undefined && isDue(states[w.id], today))
    .sort((a, b) => states[a.id].due.localeCompare(states[b.id].due) || states[a.id].box - states[b.id].box)
}

export interface SessionInput {
  words: readonly Word[]
  states: States
  level: Level
  today: string
  /** How many new words this session may introduce. */
  newLimit: number
  size?: number
  rng: Rng
}

export function buildSession(input: SessionInput): QuizItem[] {
  const size = input.size ?? SESSION_SIZE
  const reviews = dueWords(input.words, input.states, input.today).slice(0, size)
  const newCount = Math.max(0, Math.min(input.newLimit, size - reviews.length))
  const fresh = newWordQueue(input.words, input.states, input.level).slice(0, newCount)
  const reviewItems = shuffle(reviews, input.rng).map((w) =>
    makeQuiz(w, quizTypeFor(input.states[w.id].box, false, input.rng), input.words, input.rng),
  )
  const newItems = fresh.map((w) => makeQuiz(w, 'meaning', input.words, input.rng, true))
  return [...reviewItems, ...newItems]
}
