import type { Level } from '../../content/types.ts'
import { reasoningFor } from './models.ts'
import { requestJson, type ChatMessage, type JsonResponse } from './openrouter.ts'
import {
  isSummary,
  isTutorTurn,
  summarySystemPrompt,
  SUMMARY_SCHEMA,
  TUTOR_SCHEMA,
  tutorSystemPrompt,
  type ConversationSummary,
  type TutorContext,
  type TutorTurn,
} from './prompts.ts'

export interface HistoryItem {
  role: 'ai' | 'user'
  text: string
}

export const HISTORY_LIMIT = 16
const START = '(The conversation starts.)'

export function buildTutorMessages(system: string, history: readonly HistoryItem[], limit = HISTORY_LIMIT): ChatMessage[] {
  const recent = history
    .slice(-limit)
    .map((m): ChatMessage => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))
  if (recent[0]?.role === 'assistant') recent.unshift({ role: 'user', content: START })
  return [{ role: 'system', content: system }, ...recent]
}

export function transcript(history: readonly HistoryItem[]): string {
  return history.map((m) => `${m.role === 'ai' ? 'Tutor' : 'Learner'}: ${m.text}`).join('\n')
}

interface Connection {
  apiKey: string
  model: string
  appUrl?: string
  fetchImpl?: typeof fetch
}

export function requestTutorTurn(
  args: Connection & { level: Level; context: TutorContext; history: readonly HistoryItem[] },
): Promise<JsonResponse<TutorTurn>> {
  return requestJson({
    apiKey: args.apiKey,
    model: args.model,
    appUrl: args.appUrl,
    fetchImpl: args.fetchImpl,
    messages: buildTutorMessages(tutorSystemPrompt(args.level, args.context), args.history),
    schemaName: 'tutor_turn',
    schema: TUTOR_SCHEMA,
    validate: isTutorTurn,
    reasoning: reasoningFor(args.model),
    maxTokens: 600,
  })
}

export function requestSummary(args: Connection & { history: readonly HistoryItem[] }): Promise<JsonResponse<ConversationSummary>> {
  return requestJson({
    apiKey: args.apiKey,
    model: args.model,
    appUrl: args.appUrl,
    fetchImpl: args.fetchImpl,
    messages: [
      { role: 'system', content: summarySystemPrompt() },
      { role: 'user', content: transcript(args.history) },
    ],
    schemaName: 'conversation_summary',
    schema: SUMMARY_SCHEMA,
    validate: isSummary,
    reasoning: reasoningFor(args.model),
    maxTokens: 1500,
    timeoutMs: 40_000,
  })
}
