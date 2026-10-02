import { describe, expect, it } from 'vitest'
import type { Conversation } from '../../store/tutor.ts'
import { contextFor } from './contextFor.ts'

const conv = (kind: Conversation['kind'], refId: string): Conversation => ({
  id: 'c',
  kind,
  refId,
  title: 't',
  startedAt: '2026-10-02T00:00:00.000Z',
  messages: [],
  cost: 0,
})

describe('contextFor', () => {
  it('uses the topic description for free talk', () => {
    expect(contextFor(conv('free', 'weekend'))).toEqual({ kind: 'free', topic: 'weekend plans' })
  })

  it('uses the lesson scenario for role-play', () => {
    expect(contextFor(conv('roleplay', 'travel-2'))).toMatchObject({ kind: 'roleplay', role: 'a friendly front desk clerk at a hotel' })
  })

  it('falls back to everyday chat for unknown references', () => {
    expect(contextFor(conv('roleplay', 'gone'))).toEqual({ kind: 'free', topic: 'everyday life' })
    expect(contextFor(conv('free', 'gone'))).toEqual({ kind: 'free', topic: 'everyday life' })
  })
})
