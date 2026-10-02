import { describe, expect, it } from 'vitest'
import { normalize, saysWord, scoreSpeech } from './scoring.ts'

describe('normalize', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalize("I'm fine, thanks!")).toEqual(['i', 'am', 'fine', 'thanks'])
  })

  it('expands contractions the same way for target and speech', () => {
    expect(normalize("Don't worry")).toEqual(['do', 'not', 'worry'])
    expect(normalize("can't")).toEqual(['can', 'not'])
    expect(normalize("won't")).toEqual(['will', 'not'])
    expect(normalize('I’ll call you')).toEqual(['i', 'will', 'call', 'you'])
  })

  it('spells out small numbers and splits hyphens', () => {
    expect(normalize('I have 2 tickets')).toEqual(['i', 'have', 'two', 'tickets'])
    expect(normalize('check-in')).toEqual(['check', 'in'])
    expect(normalize('OK, okay!')).toEqual(['ok', 'ok'])
  })
})

describe('scoreSpeech', () => {
  it('gives 100 for an exact match', () => {
    const r = scoreSpeech('Could I get a window seat?', ['could I get a window seat'])
    expect(r.score).toBe(100)
    expect(r.tokens.every((t) => t.matched)).toBe(true)
  })

  it('marks missed words and scores by matched share', () => {
    const r = scoreSpeech('Could I get a window seat?', ['could i get a seat'])
    expect(r.score).toBe(83)
    expect(r.tokens.map((t) => [t.text, t.matched])).toEqual([
      ['Could', true],
      ['I', true],
      ['get', true],
      ['a', true],
      ['window', false],
      ['seat?', true],
    ])
  })

  it('treats contractions as equal to their long form', () => {
    expect(scoreSpeech("I'm looking for the station.", ['I am looking for the station']).score).toBe(100)
  })

  it('uses the best of several recognition candidates', () => {
    const r = scoreSpeech('Could I get a window seat?', ['could i get', 'could i get a window seat'])
    expect(r.score).toBe(100)
    expect(r.heard).toBe('could i get a window seat')
  })

  it('scores 0 when nothing was heard', () => {
    expect(scoreSpeech('Hello there', []).score).toBe(0)
  })
})

describe('saysWord', () => {
  it('finds the word or phrase inside any candidate', () => {
    expect(saysWord(['I want to apologize'], 'apologize')).toBe(true)
    expect(saysWord(['Apologize.'], 'apologize')).toBe(true)
    expect(saysWord(['I look forward to it'], 'look forward to')).toBe(true)
  })

  it('rejects other word forms and empty input', () => {
    expect(saysWord(['apology'], 'apologize')).toBe(false)
    expect(saysWord([], 'apologize')).toBe(false)
  })
})
