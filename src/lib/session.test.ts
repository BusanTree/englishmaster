import { describe, expect, it } from 'vitest'
import type { Level, Pos, Word } from '../content/types.ts'
import { seededRng } from './random.ts'
import { buildSession, clozeOf, dueWords, makeQuiz, newWordQueue, quizTypeFor } from './session.ts'
import type { WordState } from './srs.ts'

const make = (word: string, pos: Pos, meaning: string, level: Level = 1): Word => ({
  id: word,
  word,
  pos,
  meaning,
  example: `We ${word} every day.`,
  exampleKo: '예문',
  level,
})

const POOL: Word[] = [
  make('run', 'verb', '달리다'),
  make('eat', 'verb', '먹다'),
  make('read', 'verb', '읽다'),
  make('write', 'verb', '쓰다'),
  make('sleep', 'verb', '자다'),
  make('big', 'adjective', '큰'),
  make('large', 'adjective', '큰, 넓은'),
  make('small', 'adjective', '작은'),
  make('happy', 'adjective', '행복한'),
  make('apple', 'noun', '사과'),
  make('dog', 'noun', '개'),
  make('travel', 'verb', '여행하다', 2),
  make('decide', 'verb', '결정하다', 2),
  make('explain', 'verb', '설명하다', 2),
]

const today = '2026-10-02'
const st = (box: number, due: string, mastered = false): WordState => ({ box, due, correct: 1, wrong: 0, mastered })

describe('quizTypeFor', () => {
  it('always starts new words with a meaning quiz', () => {
    expect(quizTypeFor(0, true, seededRng(1))).toBe('meaning')
  })

  it('picks from the types allowed for the box', () => {
    const box1 = new Set(Array.from({ length: 50 }, (_, i) => quizTypeFor(1, false, seededRng(i))))
    expect([...box1].every((t) => ['meaning', 'listen'].includes(t))).toBe(true)
    const box7 = new Set(Array.from({ length: 50 }, (_, i) => quizTypeFor(7, false, seededRng(i))))
    expect([...box7].every((t) => ['speak', 'cloze', 'reverse'].includes(t))).toBe(true)
  })
})

describe('clozeOf', () => {
  it('blanks the exact headword, case-insensitively', () => {
    expect(clozeOf('I want to apologize for this.', 'apologize')).toBe('I want to ____ for this.')
    expect(clozeOf('Borrow my pen.', 'borrow')).toBe('____ my pen.')
  })

  it('does not blank other word forms', () => {
    expect(clozeOf('He apologized. I apologize.', 'apologize')).toBe('He apologized. I ____.')
  })
})

describe('makeQuiz', () => {
  it('builds four unique meaning options without synonyms of the answer', () => {
    const big = POOL.find((w) => w.id === 'big')!
    const q = makeQuiz(big, 'meaning', POOL, seededRng(3))
    expect(q.options).toHaveLength(4)
    expect(new Set(q.options).size).toBe(4)
    expect(q.options[q.answer]).toBe('큰')
    expect(q.options).not.toContain('큰, 넓은')
  })

  it('builds English word options from the same level', () => {
    const run = POOL.find((w) => w.id === 'run')!
    const q = makeQuiz(run, 'reverse', POOL, seededRng(5))
    expect(q.options[q.answer]).toBe('run')
    const level1 = new Set(POOL.filter((w) => w.level === 1).map((w) => w.word))
    expect(q.options.every((o) => level1.has(o))).toBe(true)
  })

  it('has no options for speaking quizzes', () => {
    const q = makeQuiz(POOL[0], 'speak', POOL, seededRng(1))
    expect(q).toMatchObject({ options: [], answer: -1 })
  })
})

describe('newWordQueue', () => {
  it('starts at the chosen level, then higher, then lower levels', () => {
    const queue = newWordQueue(POOL, {}, 2).map((w) => w.id)
    expect(queue.slice(0, 3)).toEqual(['travel', 'decide', 'explain'])
    expect(queue[3]).toBe('run')
  })

  it('skips words that were already seen', () => {
    expect(newWordQueue(POOL, { travel: st(1, today) }, 2)[0].id).toBe('decide')
  })
})

describe('dueWords', () => {
  it('returns due, unmastered words, oldest first', () => {
    const states = {
      run: st(2, '2026-10-01'),
      eat: st(1, today),
      read: st(1, '2026-10-03'),
      write: st(7, '2026-09-01', true),
    }
    expect(dueWords(POOL, states, today).map((w) => w.id)).toEqual(['run', 'eat'])
  })
})

describe('buildSession', () => {
  const states = {
    run: st(2, '2026-10-01'),
    eat: st(1, today),
    read: st(1, '2026-10-03'),
    write: st(7, '2026-09-01', true),
  }

  it('puts due reviews first, then new words up to the limit', () => {
    const items = buildSession({ words: POOL, states, level: 1, today, newLimit: 2, rng: seededRng(9) })
    expect(items.filter((i) => !i.isNew).map((i) => i.wordId).sort()).toEqual(['eat', 'run'])
    expect(items.filter((i) => i.isNew).map((i) => i.wordId)).toEqual(['sleep', 'big'])
    expect(items.filter((i) => i.isNew).every((i) => i.type === 'meaning')).toBe(true)
  })

  it('never exceeds the session size', () => {
    const items = buildSession({ words: POOL, states, level: 1, today, newLimit: 5, size: 3, rng: seededRng(9) })
    expect(items).toHaveLength(3)
    expect(items.filter((i) => i.isNew)).toHaveLength(1)
  })

  it('is empty when nothing is due and no new words are allowed', () => {
    const allMastered = Object.fromEntries(POOL.map((w) => [w.id, st(7, today, true)]))
    expect(buildSession({ words: POOL, states: allMastered, level: 1, today, newLimit: 10, rng: seededRng(1) })).toEqual([])
    expect(buildSession({ words: POOL, states: {}, level: 1, today, newLimit: 0, rng: seededRng(1) })).toEqual([])
  })
})
