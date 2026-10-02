import { LESSON_BY_ID, TOPIC_BY_ID } from '../../content/index.ts'
import { useTutor, type Conversation } from '../../store/tutor.ts'

/** Creates a conversation that opens with the topic's or lesson's first AI line. Returns its id, or null for an unknown ref. */
export function startConversation(kind: 'free' | 'roleplay', refId: string): string | null {
  const source =
    kind === 'free'
      ? (() => {
          const t = TOPIC_BY_ID.get(refId)
          return t && { title: t.title, opening: t.opening, openingKo: t.openingKo }
        })()
      : (() => {
          const l = LESSON_BY_ID.get(refId)
          return l && { title: l.title, opening: l.aiScenario.opening, openingKo: l.aiScenario.openingKo }
        })()
  if (!source) return null
  const conversation: Conversation = {
    id: crypto.randomUUID(),
    kind,
    refId,
    title: source.title,
    startedAt: new Date().toISOString(),
    messages: [{ id: crypto.randomUUID(), role: 'ai', text: source.opening, textKo: source.openingKo }],
    cost: 0,
  }
  useTutor.getState().start(conversation)
  return conversation.id
}

/** The app's own URL, used as the OAuth callback and as the HTTP-Referer for OpenRouter. */
export function appUrl(): string {
  return `${window.location.origin}${window.location.pathname}`
}
