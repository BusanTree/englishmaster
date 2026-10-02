import { LESSON_BY_ID, TOPIC_BY_ID } from '../../content/index.ts'
import type { TutorContext } from '../../lib/ai/prompts.ts'
import type { Conversation } from '../../store/tutor.ts'

/** The scene the AI should play for a conversation: a lesson's role-play or a free-talk topic. */
export function contextFor(conversation: Conversation): TutorContext {
  if (conversation.kind === 'roleplay') {
    const lesson = LESSON_BY_ID.get(conversation.refId)
    if (lesson) return { kind: 'roleplay', role: lesson.aiScenario.role, situation: lesson.aiScenario.situation }
  } else {
    const topic = TOPIC_BY_ID.get(conversation.refId)
    if (topic) return { kind: 'free', topic: topic.topic }
  }
  return { kind: 'free', topic: 'everyday life' }
}
