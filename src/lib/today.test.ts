import { describe, expect, it } from 'vitest'
import type { Course, Lesson, Level, Word } from '../content/types.ts'
import { nextLesson, todayPlan } from './today.ts'

const today = '2026-10-02'
const w = (id: string, level: Level = 1): Word => ({ id, word: id, pos: 'noun', meaning: id, example: id, exampleKo: id, level })
const words = [w('a'), w('b'), w('c'), w('d', 2)]

describe('todayPlan', () => {
  it('counts due reviews and the new words still allowed today', () => {
    const states = { a: { box: 1, due: today, correct: 1, wrong: 0, mastered: false } }
    expect(todayPlan(words, states, 1, { [today]: 1 }, 2, today)).toEqual({ due: 1, fresh: 1, moreAvailable: true })
  })

  it('caps new words by what is left to learn', () => {
    const states = Object.fromEntries(['a', 'b', 'c'].map((id) => [id, { box: 2, due: '2026-10-05', correct: 1, wrong: 0, mastered: false }]))
    expect(todayPlan(words, states, 1, {}, 10, today)).toEqual({ due: 0, fresh: 1, moreAvailable: true })
  })

  it('reports when every word has been seen', () => {
    const states = Object.fromEntries(words.map((x) => [x.id, { box: 7, due: today, correct: 7, wrong: 0, mastered: true }]))
    expect(todayPlan(words, states, 1, {}, 10, today)).toEqual({ due: 0, fresh: 0, moreAvailable: false })
  })
})

describe('nextLesson', () => {
  const lesson = (id: string): Lesson =>
    ({ id, courseId: 'daily', title: id, description: '', expressions: [], dialogue: { setting: '', aiRole: '', userRole: '', lines: [] }, aiScenario: { role: '', situation: '', opening: '', openingKo: '' } })
  const courses: Course[] = [
    { id: 'daily', title: '일상', description: '', lessons: [lesson('daily-1'), lesson('daily-2')] },
    { id: 'travel', title: '여행', description: '', lessons: [{ ...lesson('travel-1'), courseId: 'travel' }] },
  ]

  it('returns the first unfinished lesson with its course progress', () => {
    const next = nextLesson(courses, { 'daily-1': { completedAt: today, bestScore: 80 } })
    expect(next?.lesson.id).toBe('daily-2')
    expect(next?.done).toBe(1)
  })

  it('returns null when every lesson is done', () => {
    const all = Object.fromEntries(['daily-1', 'daily-2', 'travel-1'].map((id) => [id, { completedAt: today, bestScore: 90 }]))
    expect(nextLesson(courses, all)).toBeNull()
  })
})
