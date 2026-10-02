export type Level = 1 | 2 | 3 | 4

export type Pos =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'pronoun'
  | 'determiner'
  | 'interjection'
  | 'phrase'

/** One entry in a vocab-l*.json file. */
export interface RawWord {
  word: string
  pos: Pos
  /** Korean senses separated by ", ". */
  meaning: string
  /** Must contain `word` exactly (case-insensitive, whole word). */
  example: string
  exampleKo: string
}

export interface Word extends RawWord {
  /** Lowercased headword; unique across all levels. */
  id: string
  level: Level
}

export interface Expression {
  en: string
  ko: string
  tip?: string
}

export interface DialogueLine {
  speaker: 'ai' | 'user'
  en: string
  ko: string
}

export interface Dialogue {
  /** Korean description of the scene. */
  setting: string
  aiRole: string
  userRole: string
  lines: DialogueLine[]
}

export interface AiScenario {
  /** Role the AI plays, in English. */
  role: string
  /** Scene description for the AI, in English. */
  situation: string
  opening: string
  openingKo: string
}

export type CourseId = 'daily' | 'travel' | 'work' | 'feelings'

/** One entry in a lessons-*.json file. */
export interface RawLesson {
  id: string
  title: string
  description: string
  expressions: Expression[]
  dialogue: Dialogue
  aiScenario: AiScenario
}

export interface Lesson extends RawLesson {
  courseId: CourseId
}

export interface Course {
  id: CourseId
  title: string
  description: string
  lessons: Lesson[]
}

export interface Topic {
  id: string
  /** Korean label shown in the app. */
  title: string
  /** English description given to the AI. */
  topic: string
  opening: string
  openingKo: string
}
