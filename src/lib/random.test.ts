import { describe, expect, it } from 'vitest'
import { pick, seededRng, shuffle } from './random.ts'

describe('seededRng', () => {
  it('is deterministic and stays in [0, 1)', () => {
    const a = seededRng(42)
    const b = seededRng(42)
    const xs = Array.from({ length: 100 }, () => a())
    expect(xs).toEqual(Array.from({ length: 100 }, () => b()))
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true)
  })
})

describe('shuffle', () => {
  it('keeps every element and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6]
    const out = shuffle(input, seededRng(1))
    expect([...out].sort()).toEqual(input)
    expect(input).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('pick', () => {
  it('returns an element of the list', () => {
    expect(['a', 'b', 'c']).toContain(pick(['a', 'b', 'c'], seededRng(7)))
  })
})
