import { describe, expect, it } from 'vitest'
import { COURSES, LESSONS, TOPICS, WORDS, wordsOfLevel } from './index.ts'
import type { Level } from './types.ts'

const POS = new Set(['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'determiner', 'interjection', 'phrase'])

function containsExactly(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^A-Za-z])${escaped}([^A-Za-z]|$)`, 'i').test(text)
}

const stripEnd = (s: string) => s.replace(/[.?!]+$/, '').trim().toLowerCase()

describe('vocabulary', () => {
  it.each([1, 2, 3, 4] as Level[])('level %i has 200 words', (level) => {
    expect(wordsOfLevel(level)).toHaveLength(200)
  })

  it('has unique headwords across all levels', () => {
    const seen = new Set<string>()
    const dups: string[] = []
    for (const w of WORDS) {
      if (seen.has(w.id)) dups.push(w.word)
      seen.add(w.id)
    }
    expect(dups).toEqual([])
  })

  it('has complete, short fields', () => {
    const bad = WORDS.filter(
      (w) =>
        !w.word.trim() ||
        !POS.has(w.pos) ||
        !w.meaning.trim() ||
        w.meaning.length > 24 ||
        !w.example.trim() ||
        !w.exampleKo.trim() ||
        /\d/.test(w.example),
    )
    expect(bad.map((w) => w.word)).toEqual([])
  })

  it('uses the exact headword in every example', () => {
    const bad = WORDS.filter((w) => !containsExactly(w.example, w.word))
    expect(bad.map((w) => `${w.word}: ${w.example}`)).toEqual([])
  })
})

describe('lessons', () => {
  it('has four courses with six lessons each', () => {
    expect(COURSES.map((c) => c.id)).toEqual(['daily', 'travel', 'work', 'feelings'])
    expect(COURSES.map((c) => c.lessons.length)).toEqual([6, 6, 6, 6])
  })

  it('has unique lesson ids', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length)
  })

  it('has six expressions and a six-to-eight line dialogue that the AI opens', () => {
    const bad = LESSONS.filter(
      (l) =>
        l.expressions.length !== 6 ||
        l.dialogue.lines.length < 6 ||
        l.dialogue.lines.length > 8 ||
        l.dialogue.lines[0].speaker !== 'ai' ||
        l.dialogue.lines.filter((x) => x.speaker === 'user').length < 3,
    )
    expect(bad.map((l) => l.id)).toEqual([])
  })

  it('uses at least two key expressions in the learner’s lines', () => {
    const bad = LESSONS.filter((l) => {
      const userText = l.dialogue.lines.filter((x) => x.speaker === 'user').map((x) => x.en.toLowerCase()).join(' | ')
      return l.expressions.filter((e) => userText.includes(stripEnd(e.en))).length < 2
    })
    expect(bad.map((l) => l.id)).toEqual([])
  })

  it('has every text field filled in', () => {
    const bad = LESSONS.filter(
      (l) =>
        !l.title ||
        !l.description ||
        l.expressions.some((e) => !e.en.trim() || !e.ko.trim()) ||
        l.dialogue.lines.some((x) => !x.en.trim() || !x.ko.trim()) ||
        !l.dialogue.setting ||
        !l.aiScenario.role ||
        !l.aiScenario.situation ||
        !l.aiScenario.opening ||
        !l.aiScenario.openingKo,
    )
    expect(bad.map((l) => l.id)).toEqual([])
  })
})

describe('topics', () => {
  it('has ten free-talk topics with openings', () => {
    expect(TOPICS).toHaveLength(10)
    expect(TOPICS.every((t) => t.id && t.title && t.topic && t.opening && t.openingKo)).toBe(true)
  })
})
