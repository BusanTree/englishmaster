import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_MODEL } from '../lib/ai/models.ts'
import type { ConversationSummary } from '../lib/ai/prompts.ts'

export interface Correction {
  corrected: string
  explanationKo: string
}

export interface TutorMessage {
  id: string
  role: 'ai' | 'user'
  text: string
  /** Korean translation of an AI line. */
  textKo?: string
  /** Suggested next lines, on AI messages. */
  hints?: string[]
  /** On learner messages: null when it was fine, undefined until the AI has answered. */
  correction?: Correction | null
}

export interface Conversation {
  id: string
  kind: 'free' | 'roleplay'
  /** Topic id for free talk, lesson id for role-play. */
  refId: string
  title: string
  startedAt: string
  endedAt?: string
  messages: TutorMessage[]
  summary?: ConversationSummary
  /** USD spent on this conversation. */
  cost: number
}

export const MAX_CONVERSATIONS = 30

interface TutorStore {
  apiKey: string | null
  model: string
  /** Newest first. */
  conversations: Conversation[]
  setApiKey: (key: string | null) => void
  setModel: (model: string) => void
  start: (conversation: Conversation) => void
  addMessage: (conversationId: string, message: TutorMessage) => void
  setCorrection: (conversationId: string, messageId: string, correction: Correction | null) => void
  addCost: (conversationId: string, cost: number) => void
  finish: (conversationId: string, endedAt: string, summary?: ConversationSummary) => void
  remove: (conversationId: string) => void
  replaceHistory: (model: string, conversations: Conversation[]) => void
}

function update(list: Conversation[], id: string, fn: (c: Conversation) => Conversation): Conversation[] {
  return list.map((c) => (c.id === id ? fn(c) : c))
}

export const useTutor = create<TutorStore>()(
  persist(
    (set) => ({
      apiKey: null,
      model: DEFAULT_MODEL,
      conversations: [],
      setApiKey: (apiKey) => set({ apiKey }),
      setModel: (model) => set({ model }),
      start: (conversation) =>
        set((s) => ({
          conversations: [conversation, ...s.conversations.filter((c) => c.id !== conversation.id)].slice(0, MAX_CONVERSATIONS),
        })),
      addMessage: (id, message) =>
        set((s) => ({ conversations: update(s.conversations, id, (c) => ({ ...c, messages: [...c.messages, message] })) })),
      setCorrection: (id, messageId, correction) =>
        set((s) => ({
          conversations: update(s.conversations, id, (c) => ({
            ...c,
            messages: c.messages.map((m) => (m.id === messageId ? { ...m, correction } : m)),
          })),
        })),
      addCost: (id, cost) => set((s) => ({ conversations: update(s.conversations, id, (c) => ({ ...c, cost: c.cost + cost })) })),
      finish: (id, endedAt, summary) =>
        set((s) => ({ conversations: update(s.conversations, id, (c) => ({ ...c, endedAt, summary })) })),
      remove: (id) => set((s) => ({ conversations: s.conversations.filter((c) => c.id !== id) })),
      replaceHistory: (model, conversations) => set({ model, conversations: conversations.slice(0, MAX_CONVERSATIONS) }),
    }),
    { name: 'em:tutor', version: 1 },
  ),
)
