import type { Level } from '../../content/types.ts'
import { normalize } from '../scoring.ts'

const LEVEL_GUIDE: Record<Level, string> = {
  1: 'beginner (CEFR A2). Use very common words and short sentences of under 12 words.',
  2: 'elementary to intermediate (CEFR B1). Use everyday words and sentences of under 16 words.',
  3: 'intermediate (CEFR B2). Use natural, varied everyday English.',
  4: 'advanced (CEFR C1). Use natural, idiomatic English, including workplace expressions.',
}

export type TutorContext =
  | { kind: 'free'; topic: string }
  | { kind: 'roleplay'; role: string; situation: string }

export function tutorSystemPrompt(level: Level, context: TutorContext): string {
  const scene =
    context.kind === 'free'
      ? `You are chatting casually with the learner about: ${context.topic}. Show interest, share a little about yourself, and keep the conversation going.`
      : `This is a role-play. You are ${context.role}. Situation: ${context.situation} Stay in character and move the scene forward naturally.`
  return [
    'You are a friendly English speaking tutor for a Korean adult who practices speaking in a phone app.',
    `The learner is ${LEVEL_GUIDE[level]}`,
    scene,
    'The learner talks through speech recognition, so ignore capitalization, punctuation, and words that look like recognition errors.',
    'Answer with JSON only, using these fields:',
    '- reply: your next line in English, 1-3 short sentences. Usually end with a question so the learner keeps talking.',
    '- replyKo: a natural Korean translation of reply.',
    '- correction: feedback on the learner’s last message.',
    '  - needed: true only for a grammar mistake, a wrong word, or clearly unnatural phrasing. A correct, natural message must get false. Do not rewrite messages that are already fine.',
    '  - corrected: when needed, the learner’s message rewritten as natural English with the same meaning; otherwise "".',
    '  - explanationKo: when needed, 1-2 short Korean sentences about the key fix; otherwise "".',
    '  - If the learner wrote Korean or mixed Korean and English, set needed to true, put the natural English version in corrected, and explain briefly in Korean.',
    '- hints: two short things the learner could say next, in English, at their level.',
  ].join('\n')
}

export interface TutorTurn {
  reply: string
  replyKo: string
  correction: { needed: boolean; corrected: string; explanationKo: string }
  hints: string[]
}

export const TUTOR_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    replyKo: { type: 'string' },
    correction: {
      type: 'object',
      properties: {
        needed: { type: 'boolean' },
        corrected: { type: 'string' },
        explanationKo: { type: 'string' },
      },
      required: ['needed', 'corrected', 'explanationKo'],
      additionalProperties: false,
    },
    hints: { type: 'array', items: { type: 'string' } },
  },
  required: ['reply', 'replyKo', 'correction', 'hints'],
  additionalProperties: false,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((x) => typeof x === 'string')
}

export function isTutorTurn(value: unknown): value is TutorTurn {
  if (!isRecord(value) || !isRecord(value.correction)) return false
  const c = value.correction
  return (
    typeof value.reply === 'string' &&
    value.reply.trim() !== '' &&
    typeof value.replyKo === 'string' &&
    isStringArray(value.hints) &&
    typeof c.needed === 'boolean' &&
    typeof c.corrected === 'string' &&
    typeof c.explanationKo === 'string'
  )
}

/** The correction worth showing for a learner message, or null when there is nothing to fix. */
export function toCorrection(
  said: string,
  correction: TutorTurn['correction'],
): { corrected: string; explanationKo: string } | null {
  const corrected = correction.corrected.trim()
  if (!correction.needed || !corrected) return null
  if (normalize(corrected).join(' ') === normalize(said).join(' ')) return null
  return { corrected, explanationKo: correction.explanationKo.trim() }
}

export interface ConversationSummary {
  goodPoints: string[]
  fixes: { original: string; corrected: string; explanationKo: string }[]
  usefulExpressions: { en: string; ko: string }[]
}

export function summarySystemPrompt(): string {
  return [
    'You review an English speaking practice conversation between a tutor and a Korean learner. Write every explanation in Korean.',
    'Answer with JSON only, using these fields:',
    '- goodPoints: 1-3 short Korean sentences praising specific things the learner did well.',
    '- fixes: up to 5 of the learner’s most useful mistakes, each with original (the learner’s sentence), corrected (natural English), and explanationKo (one short Korean sentence). Use an empty list if there were no real mistakes.',
    '- usefulExpressions: 3-5 useful English expressions for this conversation’s situation, each with en and ko.',
  ].join('\n')
}

export const SUMMARY_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    goodPoints: { type: 'array', items: { type: 'string' } },
    fixes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          original: { type: 'string' },
          corrected: { type: 'string' },
          explanationKo: { type: 'string' },
        },
        required: ['original', 'corrected', 'explanationKo'],
        additionalProperties: false,
      },
    },
    usefulExpressions: {
      type: 'array',
      items: {
        type: 'object',
        properties: { en: { type: 'string' }, ko: { type: 'string' } },
        required: ['en', 'ko'],
        additionalProperties: false,
      },
    },
  },
  required: ['goodPoints', 'fixes', 'usefulExpressions'],
  additionalProperties: false,
}

export function isSummary(value: unknown): value is ConversationSummary {
  if (!isRecord(value)) return false
  const { goodPoints, fixes, usefulExpressions } = value
  return (
    isStringArray(goodPoints) &&
    Array.isArray(fixes) &&
    fixes.every(
      (f) => isRecord(f) && typeof f.original === 'string' && typeof f.corrected === 'string' && typeof f.explanationKo === 'string',
    ) &&
    Array.isArray(usefulExpressions) &&
    usefulExpressions.every((e) => isRecord(e) && typeof e.en === 'string' && typeof e.ko === 'string')
  )
}
