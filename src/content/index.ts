import type { Course, CourseId, Lesson, Level, RawLesson, RawWord, Topic, Word } from './types.ts'
import lessonsDaily from './lessons-daily.json'
import lessonsFeelings from './lessons-feelings.json'
import lessonsTravel from './lessons-travel.json'
import lessonsWork from './lessons-work.json'
import topics from './topics.json'
import vocabL1 from './vocab-l1.json'
import vocabL2 from './vocab-l2.json'
import vocabL3 from './vocab-l3.json'
import vocabL4 from './vocab-l4.json'

function toWords(raw: unknown, level: Level): Word[] {
  return (raw as RawWord[]).map((w) => ({ ...w, id: w.word.toLowerCase(), level }))
}

export const WORDS: Word[] = [
  ...toWords(vocabL1, 1),
  ...toWords(vocabL2, 2),
  ...toWords(vocabL3, 3),
  ...toWords(vocabL4, 4),
]

export const WORD_BY_ID = new Map(WORDS.map((w) => [w.id, w]))

export function wordsOfLevel(level: Level): Word[] {
  return WORDS.filter((w) => w.level === level)
}

export const LEVEL_NAMES: Record<Level, string> = { 1: '기초', 2: '일상', 3: '중급', 4: '고급' }

export const LEVEL_DESCRIPTIONS: Record<Level, string> = {
  1: '간단한 문장을 읽고 말할 수 있어요',
  2: '쉬운 일상 대화는 할 수 있어요',
  3: '웬만한 대화는 되지만 표현이 막혀요',
  4: '업무나 깊은 대화에도 영어를 써요',
}

const COURSE_META: { id: CourseId; title: string; description: string; raw: unknown }[] = [
  { id: 'daily', title: '일상', description: '매일 쓰는 기본 대화', raw: lessonsDaily },
  { id: 'travel', title: '여행', description: '공항부터 호텔, 식당까지', raw: lessonsTravel },
  { id: 'work', title: '직장', description: '회의, 일정, 업무 대화', raw: lessonsWork },
  { id: 'feelings', title: '감정·관계', description: '마음을 전하는 표현', raw: lessonsFeelings },
]

export const COURSES: Course[] = COURSE_META.map(({ id, title, description, raw }) => ({
  id,
  title,
  description,
  lessons: (raw as RawLesson[]).map((l): Lesson => ({ ...l, courseId: id })),
}))

export const LESSONS: Lesson[] = COURSES.flatMap((c) => c.lessons)
export const LESSON_BY_ID = new Map(LESSONS.map((l) => [l.id, l]))

export const TOPICS: Topic[] = topics as Topic[]
export const TOPIC_BY_ID = new Map(TOPICS.map((t) => [t.id, t]))
