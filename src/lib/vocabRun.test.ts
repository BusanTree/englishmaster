import { describe, expect, it } from 'vitest'
import { seededRng } from './random.ts'
import type { QuizItem } from './session.ts'
import { answerRun, beginQuestion, nextRun, runSummary, startRun } from './vocabRun.ts'

const item = (wordId: string, isNew = false): QuizItem => ({
  wordId,
  type: 'meaning',
  options: ['a', 'b', 'c', 'd'],
  answer: 0,
  isNew,
  isRetry: false,
})

describe('vocabRun', () => {
  it('shows an intro card before a new word', () => {
    const s = startRun([item('w1', true)])
    expect(s.phase).toBe('intro')
    expect(beginQuestion(s).phase).toBe('question')
  })

  it('re-queues a wrong first answer once, at the end', () => {
    let s = startRun([item('w1'), item('w2')])
    s = answerRun(s, false, seededRng(1))
    expect(s.phase).toBe('feedback')
    expect(s.lastCorrect).toBe(false)
    expect(s.items).toHaveLength(3)
    const retry = s.items[2]
    expect(retry).toMatchObject({ wordId: 'w1', isRetry: true })
    expect(retry.options[retry.answer]).toBe('a')

    s = nextRun(s)
    s = answerRun(s, true)
    s = nextRun(s)
    expect(s.items[s.index].isRetry).toBe(true)
    s = answerRun(s, false)
    expect(s.items).toHaveLength(3)
    s = nextRun(s)
    expect(s.phase).toBe('done')
  })

  it('ignores answers outside the question phase', () => {
    const s = startRun([item('w1', true)])
    expect(answerRun(s, true)).toBe(s)
  })

  it('summarizes first attempts only', () => {
    let s = startRun([item('w1'), item('w2')])
    s = nextRun(answerRun(s, false))
    s = nextRun(answerRun(s, true))
    s = nextRun(answerRun(s, true))
    expect(runSummary(s)).toEqual({ total: 2, correct: 1, accuracy: 50, missed: ['w1'] })
  })

  it('is done immediately for an empty session', () => {
    expect(startRun([]).phase).toBe('done')
  })
})
