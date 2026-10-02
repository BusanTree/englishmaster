# EnglishMaster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스픽식 말하기 레슨 + 말해보카식 단어 간격 반복 + OpenRouter AI 튜터를 갖춘, 갤럭시 크롬용 개인 영어 학습 PWA를 만들어 GitHub Pages에 배포한다.

**Architecture:** 서버 없는 React SPA. 학습 로직은 `src/lib`의 순수 함수(단위 테스트), 상태는 Zustand + localStorage, 음성은 브라우저 Web Speech API, AI는 브라우저에서 OpenRouter를 직접 호출한다(CORS 허용 확인됨). 콘텐츠(단어 800개, 레슨 24개)는 번들에 포함된 JSON이다.

**Tech Stack:** Vite 8, React 19, TypeScript 6, Tailwind CSS 4, Zustand 5, React Router 8 (HashRouter), vite-plugin-pwa 1.3, Vitest 5 (+ happy-dom), lucide-react, canvas-confetti

**Spec:** `docs/superpowers/specs/2026-10-02-englishmaster-design.md`

**Execution note:** 사용자가 "묻지 말고 끝까지 진행"을 지시하고 잠들었으므로 실행 방식은 Native(이 세션에서 직접 구현, 서브에이전트 미사용)로 정한다. 순수 로직·스토어·AI·음성 모듈(Task 2~11)은 이 문서에 전체 코드를 싣고, 실행할 때는 `File:` 표시가 붙은 코드 블록을 그대로 파일로 옮긴다. 화면(Task 18~26)은 브라우저로 확인하면서 다듬어야 하므로 화면 구성, 상태, 이벤트, 문구, 그리고 로직이 있는 부분의 코드를 명세하고 JSX 세부는 실행하면서 작성한다.

## Global Constraints

- UI 문구는 한국어, 학습 콘텐츠는 영어. 앱 이름은 `EnglishMaster`. 스픽·말해보카의 이름, 로고, 캐릭터는 쓰지 않는다.
- 대상 환경: 안드로이드 크롬(설치형 PWA). 화면 폭 360~430px에서 가로 스크롤이 생기면 안 된다. 하단 안전 영역(`env(safe-area-inset-bottom)`)을 확보한다.
- 서버 없음. OpenRouter는 `https://openrouter.ai/api/v1/chat/completions`를 브라우저에서 직접 호출한다.
- localStorage 키 접두사는 `em:`. API 키는 백업 파일에 넣지 않는다.
- 간격 반복 간격은 정확히 `[1, 2, 4, 7, 15, 30, 60]`일. 한 세션 최대 15문제.
- XP: 단어 정답 +2(재출제 정답 0), 말하기 문장 통과 +5, 레슨 완료 +20, AI 대화 한 턴 +3. 하루 목표 30/50/100.
- 말하기 통과 기준: 따라 말하기 80, 영어로 말하기 70, 대본 롤플레이 60.
- AI 임시 기본 모델 `google/gemini-3.8-flash`. AI 요청 `max_tokens` 600, 타임아웃 25초, 기록은 최근 16개 메시지만 보낸다.
- Vite `base`는 `/englishmaster/`. 배포 주소 `https://busantree.github.io/englishmaster/`.
- 코드 스타일: 세미콜론 없음, 작은따옴표, 2칸 들여쓰기(Vite 템플릿과 동일). 상대 경로 import에는 `.ts`/`.tsx` 확장자를 붙인다(벤치마크 스크립트를 Node 타입 스트리핑으로 실행하기 위해).
- 날짜는 항상 동작 시점에 `dayKey()`로 계산한다(화면을 띄운 시점 값을 캐시하지 않는다).

## Review Focus

1. 마이크 권한 거부, 음성인식 미지원 브라우저(삼성 인터넷, PC 파이어폭스): 영원히 "듣는 중"에 멈추지 말고 안내 문구와 함께 키보드 입력으로 넘어가야 한다. → Task 10 `Recognizer` 테스트(미지원, not-allowed), Task 18 `SpeakInput` 수동 확인.
2. 말없이 마이크를 끄거나 두 번 빠르게 누름: 결과 없이 끝나도 대기 상태로 돌아오고 "잘 안 들렸어요" 안내가 떠야 한다. → Task 10 테스트(결과 없이 end, 중복 start).
3. 앱을 켠 채 자정을 넘김: XP, 학습한 날, 새 단어 수가 새 날짜로 기록돼야 한다. → Task 9 스토어 테스트(다른 날짜로 연속 호출).
4. 콘텐츠를 다 배웠거나 오늘 할 게 없음: 세션이 빈 배열이어도 화면이 깨지지 않고 "오늘 단어 완료" 상태가 나와야 한다. → Task 5 테스트(빈 세션, 새 단어 소진).
5. OAuth 콜백 실패(잘못된 code, 다른 브라우저에서 열어 verifier 없음): 오류를 보여주고 주소의 `?code=`를 지워 앱을 계속 쓸 수 있어야 한다. → Task 8 `completeOAuth` 테스트.

---

## File Structure

```
.github/workflows/deploy.yml      GitHub Pages 배포
index.html                        HTML 진입점 (Pretendard, theme-color)
vite.config.ts                    Vite + React + Tailwind + PWA + Vitest 설정
public/logo.svg                   앱 아이콘 원본 (PWA 아이콘 생성용)
scripts/bench-models.ts           OpenRouter 모델 비교
src/main.tsx                      진입점: OAuth 콜백 처리 후 렌더
src/App.tsx                       라우터와 온보딩 가드
src/index.css                     Tailwind + 디자인 토큰
src/content/types.ts              콘텐츠 타입
src/content/index.ts              콘텐츠 로더 (WORDS, COURSES, LESSONS, TOPICS)
src/content/*.json                단어 4개, 레슨 4개, 주제 1개
src/content/content.test.ts       콘텐츠 검증
src/lib/date.ts                   날짜 키
src/lib/random.ts                 시드 난수, 셔플
src/lib/srs.ts                    Leitner 일정
src/lib/scoring.ts                말하기 채점
src/lib/session.ts                단어 세션 구성, 퀴즈 생성
src/lib/vocabRun.ts               단어 세션 진행 상태 머신
src/lib/progress.ts               XP 상수, 연속 학습일, 달력, 통계
src/lib/backup.ts                 백업 파일 형식
src/lib/ai/models.ts              모델 목록
src/lib/ai/prompts.ts             프롬프트, JSON 스키마, 응답 검증
src/lib/ai/openrouter.ts          요청, 재시도, 오류 분류
src/lib/ai/oauth.ts               PKCE, 콜백 처리
src/store/settings.ts             설정 스토어
src/store/progress.ts             진도 스토어
src/store/tutor.ts                AI 튜터 스토어
src/store/backup.ts               스토어 ↔ 백업 파일
src/store/toast.ts                토스트 메시지
src/speech/recognizer.ts          음성인식 컨트롤러 (프레임워크 무관)
src/speech/useSpeechRecognition.ts 음성인식 훅
src/speech/tts.ts                 발음 재생
src/speech/useSpeak.ts            설정을 반영한 발음 재생 훅
src/components/*.tsx              공통 UI
src/screens/**                    화면
```

---

### Task 1: 프로젝트 뼈대

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `.gitattributes`, `.oxlintrc.json`, `public/logo.svg`, `src/main.tsx`, `src/App.tsx`, `src/index.css`

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm test`, `npm run lint` 스크립트. 이후 모든 Task가 사용.

- [ ] **Step 1: 설정 파일 작성**

File: `package.json`
```json
{
  "name": "englishmaster",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "oxlint",
    "bench": "node scripts/bench-models.ts"
  }
}
```

File: `tsconfig.json`
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

File: `tsconfig.app.json`
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "esnext",
    "types": ["vite/client", "vite-plugin-pwa/client"],
    "allowArbitraryExtensions": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

File: `tsconfig.node.json`
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "types": ["node"],
    "skipLibCheck": true,
    "module": "nodenext",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts", "scripts"]
}
```

File: `vite.config.ts`
```ts
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/englishmaster/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

File: `.gitattributes`
```
* text=auto eol=lf
*.png binary
*.ico binary
```

File: `.oxlintrc.json`
```json
{
  "plugins": ["react", "typescript", "oxc"],
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

File: `index.html`
```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/englishmaster/logo.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#ffffff" />
    <meta name="description" content="말하기 레슨, 단어 복습, AI 튜터로 매일 영어 공부" />
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
    <title>EnglishMaster</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: 의존성 설치**

```bash
npm install react@^19.3.0 react-dom@^19.3.0 react-router@^8.4.0 zustand@^5.0.15 lucide-react canvas-confetti
npm install -D typescript@~6.0.2 vite@^8.3.2 @vitejs/plugin-react@^6.1.1 tailwindcss@^4.3.3 @tailwindcss/vite@^4.3.3 vitest@^5.0.3 happy-dom @types/node@^24 @types/react @types/react-dom @types/canvas-confetti vite-plugin-pwa@^1.3.0 oxlint
```
Expected: 설치 성공, `package.json`에 의존성이 추가된다.

- [ ] **Step 3: 최소 앱 작성**

File: `src/index.css`
```css
@import "tailwindcss";

@theme {
  --font-sans: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
}

html,
body,
#root {
  height: 100%;
}

body {
  margin: 0;
  background: #fff;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior-y: none;
}
```

File: `src/main.tsx`
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

File: `src/App.tsx`
```tsx
export default function App() {
  return <main className="p-6 text-2xl font-bold">EnglishMaster</main>
}
```

`public/logo.svg`: 보라색 둥근 사각형 위에 흰 말풍선과 "E" 글자를 얹은 512×512 SVG.

- [ ] **Step 4: 빌드와 개발 서버 확인**

Run: `npm run build`
Expected: `dist/` 생성, 타입 오류 없음.

Run: 개발 서버를 띄우고 내장 브라우저로 `http://localhost:5173/englishmaster/`를 연다.
Expected: "EnglishMaster" 글자가 Pretendard로 보인다.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite React TypeScript app"
```

---

### Task 2: 날짜와 난수 유틸

**Files:**
- Create: `src/lib/date.ts`, `src/lib/random.ts`
- Test: `src/lib/date.test.ts`, `src/lib/random.test.ts`

**Interfaces:**
- Produces: `dayKey(date?: Date): string`, `parseDayKey(key: string): Date`, `addDays(key: string, days: number): string`, `diffDays(a: string, b: string): number`, `type Rng = () => number`, `seededRng(seed: number): Rng`, `shuffle<T>(items: readonly T[], rng?: Rng): T[]`, `pick<T>(items: readonly T[], rng?: Rng): T`

- [ ] **Step 1: 실패하는 테스트 작성**

File: `src/lib/date.test.ts`
```ts
import { describe, expect, it } from 'vitest'
import { addDays, dayKey, diffDays, parseDayKey } from './date.ts'

describe('dayKey', () => {
  it('formats a local date with zero padding', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('round-trips through parseDayKey', () => {
    expect(dayKey(parseDayKey('2026-10-02'))).toBe('2026-10-02')
  })
})

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-10-02', 60)).toBe('2026-12-01')
  })
})

describe('diffDays', () => {
  it('counts whole days between keys', () => {
    expect(diffDays('2026-10-01', '2026-10-03')).toBe(2)
    expect(diffDays('2026-10-03', '2026-10-01')).toBe(-2)
    expect(diffDays('2026-12-31', '2027-01-01')).toBe(1)
  })
})
```

File: `src/lib/random.test.ts`
```ts
import { describe, expect, it } from 'vitest'
import { pick, seededRng, shuffle } from './random.ts'

describe('seededRng', () => {
  it('is deterministic and stays in [0, 1)', () => {
    const a = seededRng(42)
    const b = seededRng(42)
    const xs = Array.from({ length: 100 }, () => a())
    expect(xs).toEqual(Array.from({ length: 100 }, () => b()))
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true)
  })
})

describe('shuffle', () => {
  it('keeps every element and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6]
    const out = shuffle(input, seededRng(1))
    expect([...out].sort()).toEqual(input)
    expect(input).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('pick', () => {
  it('returns an element of the list', () => {
    expect(['a', 'b', 'c']).toContain(pick(['a', 'b', 'c'], seededRng(7)))
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/date.test.ts src/lib/random.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

File: `src/lib/date.ts`
```ts
/** Local calendar day as 'YYYY-MM-DD'. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, days: number): string {
  const date = parseDayKey(key)
  date.setDate(date.getDate() + days)
  return dayKey(date)
}

/** Whole days from a to b (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDayKey(b).getTime() - parseDayKey(a).getTime()) / 86_400_000)
}
```

File: `src/lib/random.ts`
```ts
export type Rng = () => number

/** Deterministic PRNG (mulberry32) so tests can fix the order of shuffled quizzes. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function pick<T>(items: readonly T[], rng: Rng = Math.random): T {
  return items[Math.floor(rng() * items.length)]
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/date.test.ts src/lib/random.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/date.ts src/lib/date.test.ts src/lib/random.ts src/lib/random.test.ts
git commit -m "feat: add day-key and seeded random utilities"
```

---

### Task 3: 간격 반복(Leitner) 일정

**Files:**
- Create: `src/lib/srs.ts`
- Test: `src/lib/srs.test.ts`

**Interfaces:**
- Consumes: `addDays` (Task 2)
- Produces: `INTERVALS`, `MAX_BOX`, `interface WordState { box: number; due: string; correct: number; wrong: number; mastered: boolean }`, `applyAnswer(prev: WordState | undefined, correct: boolean, today: string): WordState`, `isDue(state: WordState, today: string): boolean`

- [ ] **Step 1: 실패하는 테스트 작성**

File: `src/lib/srs.test.ts`
```ts
import { describe, expect, it } from 'vitest'
import { applyAnswer, isDue, type WordState } from './srs.ts'

const today = '2026-10-02'
const state = (box: number, extra: Partial<WordState> = {}): WordState => ({
  box,
  due: today,
  correct: 0,
  wrong: 0,
  mastered: false,
  ...extra,
})

describe('applyAnswer', () => {
  it('moves a new word answered correctly to box 1, due tomorrow', () => {
    expect(applyAnswer(undefined, true, today)).toEqual({ box: 1, due: '2026-10-03', correct: 1, wrong: 0, mastered: false })
  })

  it('puts a new word answered wrong in box 1, due tomorrow', () => {
    expect(applyAnswer(undefined, false, today)).toEqual({ box: 1, due: '2026-10-03', correct: 0, wrong: 1, mastered: false })
  })

  it('promotes one box and schedules by the new box interval', () => {
    expect(applyAnswer(state(3), true, today)).toMatchObject({ box: 4, due: '2026-10-09' })
    expect(applyAnswer(state(6), true, today)).toMatchObject({ box: 7, due: '2026-12-01' })
  })

  it('masters a word answered correctly in box 7', () => {
    expect(applyAnswer(state(7, { due: '2026-09-01' }), true, today)).toMatchObject({ box: 7, mastered: true, correct: 1 })
  })

  it('sends a wrong answer back to box 1', () => {
    expect(applyAnswer(state(5, { correct: 4 }), false, today)).toEqual({ box: 1, due: '2026-10-03', correct: 4, wrong: 1, mastered: false })
  })
})

describe('isDue', () => {
  it('is due on or after the due day unless mastered', () => {
    expect(isDue(state(2, { due: today }), today)).toBe(true)
    expect(isDue(state(2, { due: '2026-09-30' }), today)).toBe(true)
    expect(isDue(state(2, { due: '2026-10-03' }), today)).toBe(false)
    expect(isDue(state(7, { mastered: true }), today)).toBe(false)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/srs.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

File: `src/lib/srs.ts`
```ts
import { addDays } from './date.ts'

/** Days until the next review for boxes 1..7. */
export const INTERVALS = [1, 2, 4, 7, 15, 30, 60] as const
export const MAX_BOX = INTERVALS.length

export interface WordState {
  /** 1..7 once the word has been answered at least once. */
  box: number
  /** Day key of the next review. */
  due: string
  correct: number
  wrong: number
  mastered: boolean
}

export function applyAnswer(prev: WordState | undefined, correct: boolean, today: string): WordState {
  const base: WordState = prev ?? { box: 0, due: today, correct: 0, wrong: 0, mastered: false }
  if (!correct) {
    return { ...base, box: 1, due: addDays(today, INTERVALS[0]), wrong: base.wrong + 1, mastered: false }
  }
  if (base.box >= MAX_BOX) {
    return { ...base, correct: base.correct + 1, mastered: true }
  }
  const box = base.box + 1
  return { ...base, box, due: addDays(today, INTERVALS[box - 1]), correct: base.correct + 1 }
}

export function isDue(state: WordState, today: string): boolean {
  return !state.mastered && state.due <= today
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/srs.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/srs.ts src/lib/srs.test.ts
git commit -m "feat: add Leitner spaced-repetition scheduling"
```

---

### Task 4: 말하기 채점

**Files:**
- Create: `src/lib/scoring.ts`
- Test: `src/lib/scoring.test.ts`

**Interfaces:**
- Produces: `normalize(text: string): string[]`, `interface ScoredToken { text: string; matched: boolean }`, `interface ScoreResult { score: number; tokens: ScoredToken[]; heard: string }`, `scoreSpeech(target: string, candidates: string[]): ScoreResult`, `saysWord(candidates: string[], word: string): boolean`, `PASS = { repeat: 80, recall: 70, roleplay: 60 }`

- [ ] **Step 1: 실패하는 테스트 작성**

File: `src/lib/scoring.test.ts`
```ts
import { describe, expect, it } from 'vitest'
import { normalize, saysWord, scoreSpeech } from './scoring.ts'

describe('normalize', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalize("I'm fine, thanks!")).toEqual(['i', 'am', 'fine', 'thanks'])
  })

  it('expands contractions the same way for target and speech', () => {
    expect(normalize("Don't worry")).toEqual(['do', 'not', 'worry'])
    expect(normalize("can't")).toEqual(['can', 'not'])
    expect(normalize("won't")).toEqual(['will', 'not'])
    expect(normalize('I’ll call you')).toEqual(['i', 'will', 'call', 'you'])
  })

  it('spells out small numbers and splits hyphens', () => {
    expect(normalize('I have 2 tickets')).toEqual(['i', 'have', 'two', 'tickets'])
    expect(normalize('check-in')).toEqual(['check', 'in'])
    expect(normalize('OK, okay!')).toEqual(['ok', 'ok'])
  })
})

describe('scoreSpeech', () => {
  it('gives 100 for an exact match', () => {
    const r = scoreSpeech('Could I get a window seat?', ['could I get a window seat'])
    expect(r.score).toBe(100)
    expect(r.tokens.every((t) => t.matched)).toBe(true)
  })

  it('marks missed words and scores by matched share', () => {
    const r = scoreSpeech('Could I get a window seat?', ['could i get a seat'])
    expect(r.score).toBe(83)
    expect(r.tokens.map((t) => [t.text, t.matched])).toEqual([
      ['Could', true],
      ['I', true],
      ['get', true],
      ['a', true],
      ['window', false],
      ['seat?', true],
    ])
  })

  it('treats contractions as equal to their long form', () => {
    expect(scoreSpeech("I'm looking for the station.", ['I am looking for the station']).score).toBe(100)
  })

  it('uses the best of several recognition candidates', () => {
    const r = scoreSpeech('Could I get a window seat?', ['could i get', 'could i get a window seat'])
    expect(r.score).toBe(100)
    expect(r.heard).toBe('could i get a window seat')
  })

  it('scores 0 when nothing was heard', () => {
    expect(scoreSpeech('Hello there', []).score).toBe(0)
  })
})

describe('saysWord', () => {
  it('finds the word or phrase inside any candidate', () => {
    expect(saysWord(['I want to apologize'], 'apologize')).toBe(true)
    expect(saysWord(['Apologize.'], 'apologize')).toBe(true)
    expect(saysWord(['I look forward to it'], 'look forward to')).toBe(true)
  })

  it('rejects other word forms and empty input', () => {
    expect(saysWord(['apology'], 'apologize')).toBe(false)
    expect(saysWord([], 'apologize')).toBe(false)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/scoring.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

File: `src/lib/scoring.ts`
```ts
export const PASS = { repeat: 80, recall: 70, roleplay: 60 } as const

const CONTRACTIONS: Record<string, string> = {
  "can't": 'can not',
  cannot: 'can not',
  "won't": 'will not',
  "shan't": 'shall not',
  "let's": 'let us',
  "i'm": 'i am',
  "ain't": 'is not',
}

const SUFFIXES: [string, string][] = [
  ["n't", ' not'],
  ["'re", ' are'],
  ["'ve", ' have'],
  ["'ll", ' will'],
  ["'d", ' would'],
  ["'m", ' am'],
  ["'s", ' is'],
]

const NUMBERS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
]

const ALIASES: Record<string, string> = { okay: 'ok' }

function expandToken(token: string): string {
  const fixed = CONTRACTIONS[token]
  if (fixed) return fixed
  for (const [suffix, replacement] of SUFFIXES) {
    if (token.length > suffix.length && token.endsWith(suffix)) return token.slice(0, -suffix.length) + replacement
  }
  return token
}

/** Lowercased word tokens with contractions expanded and small numbers spelled out. */
export function normalize(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/-/g, ' ')
  const tokens: string[] = []
  for (const raw of cleaned.split(/\s+/)) {
    const token = raw.replace(/^'+|'+$/g, '')
    if (!token) continue
    for (const part of expandToken(token).split(' ')) {
      if (/^\d+$/.test(part) && Number(part) <= 20) tokens.push(NUMBERS[Number(part)])
      else {
        const plain = part.replace(/'/g, '')
        tokens.push(ALIASES[plain] ?? plain)
      }
    }
  }
  return tokens
}

/** For each target token, whether it is part of a longest common subsequence with the spoken tokens. */
function lcsMatches(target: string[], spoken: string[]): boolean[] {
  const n = target.length
  const m = spoken.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = target[i] === spoken[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const matched = new Array<boolean>(n).fill(false)
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (target[i] === spoken[j]) {
      matched[i] = true
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++
    else j++
  }
  return matched
}

export interface ScoredToken {
  text: string
  matched: boolean
}

export interface ScoreResult {
  /** 0..100 */
  score: number
  /** Target sentence split on spaces, each marked as heard or missed. */
  tokens: ScoredToken[]
  /** The recognition candidate that produced the score. */
  heard: string
}

function scoreOne(target: string, spoken: string): ScoreResult {
  const words = target.split(/\s+/).filter(Boolean)
  const perWord = words.map((w) => normalize(w))
  const flat = perWord.flat()
  const matched = lcsMatches(flat, normalize(spoken))
  let k = 0
  const tokens = words.map((text, idx) => {
    const count = perWord[idx].length
    const ok = matched.slice(k, k + count).every(Boolean)
    k += count
    return { text, matched: ok }
  })
  const hits = matched.filter(Boolean).length
  return { score: flat.length === 0 ? 0 : Math.round((hits / flat.length) * 100), tokens, heard: spoken }
}

export function scoreSpeech(target: string, candidates: string[]): ScoreResult {
  const options = candidates.length > 0 ? candidates : ['']
  return options.map((c) => scoreOne(target, c)).reduce((best, r) => (r.score > best.score ? r : best))
}

/** True when any candidate contains the word or phrase as whole tokens. */
export function saysWord(candidates: string[], word: string): boolean {
  const target = normalize(word)
  if (target.length === 0) return false
  return candidates.some((c) => {
    const spoken = normalize(c)
    for (let i = 0; i + target.length <= spoken.length; i++) {
      if (target.every((t, k) => spoken[i + k] === t)) return true
    }
    return false
  })
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/scoring.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring.ts src/lib/scoring.test.ts
git commit -m "feat: add speech scoring with contraction-aware word alignment"
```

---

### Task 5: 콘텐츠 타입, 단어 세션 구성, 세션 진행 상태

**Files:**
- Create: `src/content/types.ts`, `src/lib/session.ts`, `src/lib/vocabRun.ts`
- Test: `src/lib/session.test.ts`, `src/lib/vocabRun.test.ts`

**Interfaces:**
- Consumes: `Rng`, `pick`, `shuffle` (Task 2), `WordState`, `isDue` (Task 3)
- Produces:
  - 콘텐츠 타입 `Level`, `Pos`, `RawWord`, `Word`, `Expression`, `DialogueLine`, `Dialogue`, `AiScenario`, `Lesson`, `RawLesson`, `CourseId`, `Course`, `Topic`
  - `type QuizType = 'meaning' | 'listen' | 'reverse' | 'cloze' | 'speak'`, `interface QuizItem { wordId; type; options: string[]; answer: number; isNew: boolean; isRetry: boolean }`, `SESSION_SIZE = 15`, `quizTypeFor(box, isNew, rng)`, `clozeOf(example, word)`, `sharesSense(a: Word, b: Word)`, `makeQuiz(word, type, pool, rng, isNew?)`, `newWordQueue(words, states, level)`, `dueWords(words, states, today)`, `buildSession(input: SessionInput): QuizItem[]`
  - `RunState`, `RunResult`, `startRun(items)`, `beginQuestion(state)`, `answerRun(state, correct, rng?)`, `nextRun(state)`, `runSummary(state): { total; correct; accuracy; missed: string[] }`

- [ ] **Step 1: 콘텐츠 타입 작성**

File: `src/content/types.ts`
```ts
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
```

- [ ] **Step 2: 실패하는 테스트 작성**

File: `src/lib/session.test.ts`
```ts
import { describe, expect, it } from 'vitest'
import type { Level, Pos, Word } from '../content/types.ts'
import { seededRng } from './random.ts'
import { buildSession, clozeOf, dueWords, makeQuiz, newWordQueue, quizTypeFor } from './session.ts'
import type { WordState } from './srs.ts'

const make = (word: string, pos: Pos, meaning: string, level: Level = 1): Word => ({
  id: word,
  word,
  pos,
  meaning,
  example: `We ${word} every day.`,
  exampleKo: '예문',
  level,
})

const POOL: Word[] = [
  make('run', 'verb', '달리다'),
  make('eat', 'verb', '먹다'),
  make('read', 'verb', '읽다'),
  make('write', 'verb', '쓰다'),
  make('sleep', 'verb', '자다'),
  make('big', 'adjective', '큰'),
  make('large', 'adjective', '큰, 넓은'),
  make('small', 'adjective', '작은'),
  make('happy', 'adjective', '행복한'),
  make('apple', 'noun', '사과'),
  make('dog', 'noun', '개'),
  make('travel', 'verb', '여행하다', 2),
  make('decide', 'verb', '결정하다', 2),
  make('explain', 'verb', '설명하다', 2),
]

const today = '2026-10-02'
const st = (box: number, due: string, mastered = false): WordState => ({ box, due, correct: 1, wrong: 0, mastered })

describe('quizTypeFor', () => {
  it('always starts new words with a meaning quiz', () => {
    expect(quizTypeFor(0, true, seededRng(1))).toBe('meaning')
  })

  it('picks from the types allowed for the box', () => {
    const box1 = new Set(Array.from({ length: 50 }, (_, i) => quizTypeFor(1, false, seededRng(i))))
    expect([...box1].every((t) => ['meaning', 'listen'].includes(t))).toBe(true)
    const box7 = new Set(Array.from({ length: 50 }, (_, i) => quizTypeFor(7, false, seededRng(i))))
    expect([...box7].every((t) => ['speak', 'cloze', 'reverse'].includes(t))).toBe(true)
  })
})

describe('clozeOf', () => {
  it('blanks the exact headword, case-insensitively', () => {
    expect(clozeOf('I want to apologize for this.', 'apologize')).toBe('I want to ____ for this.')
    expect(clozeOf('Borrow my pen.', 'borrow')).toBe('____ my pen.')
  })

  it('does not blank other word forms', () => {
    expect(clozeOf('He apologized. I apologize.', 'apologize')).toBe('He apologized. I ____.')
  })
})

describe('makeQuiz', () => {
  it('builds four unique meaning options without synonyms of the answer', () => {
    const big = POOL.find((w) => w.id === 'big')!
    const q = makeQuiz(big, 'meaning', POOL, seededRng(3))
    expect(q.options).toHaveLength(4)
    expect(new Set(q.options).size).toBe(4)
    expect(q.options[q.answer]).toBe('큰')
    expect(q.options).not.toContain('큰, 넓은')
  })

  it('builds English word options from the same level', () => {
    const run = POOL.find((w) => w.id === 'run')!
    const q = makeQuiz(run, 'reverse', POOL, seededRng(5))
    expect(q.options[q.answer]).toBe('run')
    const level1 = new Set(POOL.filter((w) => w.level === 1).map((w) => w.word))
    expect(q.options.every((o) => level1.has(o))).toBe(true)
  })

  it('has no options for speaking quizzes', () => {
    const q = makeQuiz(POOL[0], 'speak', POOL, seededRng(1))
    expect(q).toMatchObject({ options: [], answer: -1 })
  })
})

describe('newWordQueue', () => {
  it('starts at the chosen level, then higher, then lower levels', () => {
    const queue = newWordQueue(POOL, {}, 2).map((w) => w.id)
    expect(queue.slice(0, 3)).toEqual(['travel', 'decide', 'explain'])
    expect(queue[3]).toBe('run')
  })

  it('skips words that were already seen', () => {
    expect(newWordQueue(POOL, { travel: st(1, today) }, 2)[0].id).toBe('decide')
  })
})

describe('dueWords', () => {
  it('returns due, unmastered words, oldest first', () => {
    const states = {
      run: st(2, '2026-10-01'),
      eat: st(1, today),
      read: st(1, '2026-10-03'),
      write: st(7, '2026-09-01', true),
    }
    expect(dueWords(POOL, states, today).map((w) => w.id)).toEqual(['run', 'eat'])
  })
})

describe('buildSession', () => {
  const states = {
    run: st(2, '2026-10-01'),
    eat: st(1, today),
    read: st(1, '2026-10-03'),
    write: st(7, '2026-09-01', true),
  }

  it('puts due reviews first, then new words up to the limit', () => {
    const items = buildSession({ words: POOL, states, level: 1, today, newLimit: 2, rng: seededRng(9) })
    expect(items.filter((i) => !i.isNew).map((i) => i.wordId).sort()).toEqual(['eat', 'run'])
    expect(items.filter((i) => i.isNew).map((i) => i.wordId)).toEqual(['sleep', 'big'])
    expect(items.filter((i) => i.isNew).every((i) => i.type === 'meaning')).toBe(true)
  })

  it('never exceeds the session size', () => {
    const items = buildSession({ words: POOL, states, level: 1, today, newLimit: 5, size: 3, rng: seededRng(9) })
    expect(items).toHaveLength(3)
    expect(items.filter((i) => i.isNew)).toHaveLength(1)
  })

  it('is empty when nothing is due and no new words are allowed', () => {
    const allMastered = Object.fromEntries(POOL.map((w) => [w.id, st(7, today, true)]))
    expect(buildSession({ words: POOL, states: allMastered, level: 1, today, newLimit: 10, rng: seededRng(1) })).toEqual([])
    expect(buildSession({ words: POOL, states: {}, level: 1, today, newLimit: 0, rng: seededRng(1) })).toEqual([])
  })
})
```

File: `src/lib/vocabRun.test.ts`
```ts
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
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run src/lib/session.test.ts src/lib/vocabRun.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 4: 구현**

File: `src/lib/session.ts`
```ts
import type { Level, Word } from '../content/types.ts'
import { pick, shuffle, type Rng } from './random.ts'
import { isDue, type WordState } from './srs.ts'

export type QuizType = 'meaning' | 'listen' | 'reverse' | 'cloze' | 'speak'

export interface QuizItem {
  wordId: string
  type: QuizType
  /** Four choices: Korean meanings for meaning/listen, English words for reverse/cloze, empty for speak. */
  options: string[]
  /** Index of the right option, -1 for speak. */
  answer: number
  isNew: boolean
  isRetry: boolean
}

export const SESSION_SIZE = 15

const TYPES_BY_BOX: Record<number, QuizType[]> = {
  1: ['meaning', 'listen'],
  2: ['listen', 'reverse'],
  3: ['reverse', 'cloze'],
  4: ['cloze', 'speak'],
  5: ['speak', 'cloze', 'reverse'],
  6: ['speak', 'cloze', 'reverse'],
  7: ['speak', 'cloze', 'reverse'],
}

export function quizTypeFor(box: number, isNew: boolean, rng: Rng): QuizType {
  if (isNew || box < 1) return 'meaning'
  return pick(TYPES_BY_BOX[Math.min(box, 7)], rng)
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** The example sentence with the exact headword replaced by a blank. */
export function clozeOf(example: string, word: string): string {
  return example.replace(new RegExp(`(^|[^A-Za-z])${escapeRegExp(word)}(?=[^A-Za-z]|$)`, 'i'), '$1____')
}

function senses(meaning: string): string[] {
  return meaning.split(',').map((s) => s.trim()).filter(Boolean)
}

/** True when two words share a Korean sense, so one would also be a right answer for the other. */
export function sharesSense(a: Word, b: Word): boolean {
  const mine = new Set(senses(a.meaning))
  return senses(b.meaning).some((s) => mine.has(s))
}

function distractors(word: Word, pool: readonly Word[], rng: Rng, field: 'meaning' | 'word'): string[] {
  const usable = pool.filter((w) => w.id !== word.id && !sharesSense(w, word))
  const sameLevel = usable.filter((w) => w.level === word.level)
  const tiers = [sameLevel.filter((w) => w.pos === word.pos), sameLevel, usable]
  const seen = new Set<string>([word[field]])
  const out: string[] = []
  for (const tier of tiers) {
    for (const w of shuffle(tier, rng)) {
      if (out.length === 3) return out
      if (seen.has(w[field])) continue
      seen.add(w[field])
      out.push(w[field])
    }
  }
  return out
}

export function makeQuiz(word: Word, type: QuizType, pool: readonly Word[], rng: Rng, isNew = false): QuizItem {
  if (type === 'speak') return { wordId: word.id, type, options: [], answer: -1, isNew, isRetry: false }
  const field = type === 'meaning' || type === 'listen' ? 'meaning' : 'word'
  const options = shuffle([word[field], ...distractors(word, pool, rng, field)], rng)
  return { wordId: word.id, type, options, answer: options.indexOf(word[field]), isNew, isRetry: false }
}

type States = Readonly<Record<string, WordState>>

/** Unseen words in study order: the chosen level, then higher levels, then lower ones. */
export function newWordQueue(words: readonly Word[], states: States, level: Level): Word[] {
  const levels = [1, 2, 3, 4]
  const order = [level, ...levels.filter((l) => l > level), ...levels.filter((l) => l < level)]
  return order.flatMap((l) => words.filter((w) => w.level === l && !states[w.id]))
}

export function dueWords(words: readonly Word[], states: States, today: string): Word[] {
  return words
    .filter((w) => states[w.id] !== undefined && isDue(states[w.id], today))
    .sort((a, b) => states[a.id].due.localeCompare(states[b.id].due) || states[a.id].box - states[b.id].box)
}

export interface SessionInput {
  words: readonly Word[]
  states: States
  level: Level
  today: string
  /** How many new words this session may introduce. */
  newLimit: number
  size?: number
  rng: Rng
}

export function buildSession(input: SessionInput): QuizItem[] {
  const size = input.size ?? SESSION_SIZE
  const reviews = dueWords(input.words, input.states, input.today).slice(0, size)
  const newCount = Math.max(0, Math.min(input.newLimit, size - reviews.length))
  const fresh = newWordQueue(input.words, input.states, input.level).slice(0, newCount)
  const reviewItems = shuffle(reviews, input.rng).map((w) =>
    makeQuiz(w, quizTypeFor(input.states[w.id].box, false, input.rng), input.words, input.rng),
  )
  const newItems = fresh.map((w) => makeQuiz(w, 'meaning', input.words, input.rng, true))
  return [...reviewItems, ...newItems]
}
```

File: `src/lib/vocabRun.ts`
```ts
import { shuffle, type Rng } from './random.ts'
import type { QuizItem } from './session.ts'

export type RunPhase = 'intro' | 'question' | 'feedback' | 'done'

export interface RunResult {
  wordId: string
  correct: boolean
  isNew: boolean
  isRetry: boolean
}

export interface RunState {
  items: QuizItem[]
  index: number
  phase: RunPhase
  lastCorrect: boolean | null
  results: RunResult[]
}

function phaseAt(items: QuizItem[], index: number): RunPhase {
  if (index >= items.length) return 'done'
  const item = items[index]
  return item.isNew && !item.isRetry ? 'intro' : 'question'
}

export function startRun(items: QuizItem[]): RunState {
  return { items, index: 0, phase: phaseAt(items, 0), lastCorrect: null, results: [] }
}

export function beginQuestion(state: RunState): RunState {
  return state.phase === 'intro' ? { ...state, phase: 'question' } : state
}

function retryOf(item: QuizItem, rng: Rng): QuizItem {
  if (item.options.length === 0) return { ...item, isRetry: true }
  const right = item.options[item.answer]
  const options = shuffle(item.options, rng)
  return { ...item, options, answer: options.indexOf(right), isRetry: true }
}

/** Records an answer. A wrong first attempt is asked once more at the end of the session. */
export function answerRun(state: RunState, correct: boolean, rng: Rng = Math.random): RunState {
  if (state.phase !== 'question') return state
  const item = state.items[state.index]
  const items = !correct && !item.isRetry ? [...state.items, retryOf(item, rng)] : state.items
  return {
    ...state,
    items,
    phase: 'feedback',
    lastCorrect: correct,
    results: [...state.results, { wordId: item.wordId, correct, isNew: item.isNew, isRetry: item.isRetry }],
  }
}

export function nextRun(state: RunState): RunState {
  if (state.phase !== 'feedback') return state
  const index = state.index + 1
  return { ...state, index, phase: phaseAt(state.items, index), lastCorrect: null }
}

export function runSummary(state: RunState): { total: number; correct: number; accuracy: number; missed: string[] } {
  const first = state.results.filter((r) => !r.isRetry)
  const correct = first.filter((r) => r.correct).length
  return {
    total: first.length,
    correct,
    accuracy: first.length ? Math.round((correct / first.length) * 100) : 0,
    missed: [...new Set(first.filter((r) => !r.correct).map((r) => r.wordId))],
  }
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/lib/session.test.ts src/lib/vocabRun.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/content/types.ts src/lib/session.ts src/lib/session.test.ts src/lib/vocabRun.ts src/lib/vocabRun.test.ts
git commit -m "feat: build vocab sessions and quiz items with retry flow"
```

---

### Task 6: XP, 연속 학습일, 달력, 통계

**Files:**
- Create: `src/lib/progress.ts`
- Test: `src/lib/progress.test.ts`

**Interfaces:**
- Consumes: `addDays`, `diffDays`, `parseDayKey` (Task 2), `Word`, `Level` (Task 5), `WordState` (Task 3)
- Produces: `XP`, `DAILY_GOALS`, `NEW_PER_DAY_OPTIONS`, `currentStreak(studyDays, today)`, `longestStreak(studyDays)`, `interface DayCell { date; studied; isToday; isFuture }`, `weekCells(studyDays, today)`, `calendarCells(studyDays, today, weeks?)`, `wordCounts(words, states): { fresh; learning; mastered }`, `newRemaining(newByDay, today, newPerDay)`

- [ ] **Step 1: 실패하는 테스트 작성**

File: `src/lib/progress.test.ts`
```ts
import { describe, expect, it } from 'vitest'
import type { Word } from '../content/types.ts'
import { addDays } from './date.ts'
import { calendarCells, currentStreak, longestStreak, newRemaining, weekCells, wordCounts } from './progress.ts'

const today = '2026-10-01' // Thursday

describe('currentStreak', () => {
  it('counts back from today', () => {
    expect(currentStreak([addDays(today, -2), addDays(today, -1), today], today)).toBe(3)
  })

  it('keeps yesterday’s streak alive until today ends', () => {
    expect(currentStreak([addDays(today, -2), addDays(today, -1)], today)).toBe(2)
  })

  it('is zero after a missed day', () => {
    expect(currentStreak([addDays(today, -3)], today)).toBe(0)
    expect(currentStreak([], today)).toBe(0)
  })
})

describe('longestStreak', () => {
  it('finds the longest run of consecutive days', () => {
    expect(longestStreak(['2026-01-01', '2026-01-02', '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-05'])).toBe(3)
    expect(longestStreak([])).toBe(0)
  })
})

describe('weekCells', () => {
  it('returns the Monday-first week containing today', () => {
    const cells = weekCells(['2026-09-29'], today)
    expect(cells.map((c) => c.date)).toEqual([
      '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
    ])
    expect(cells[1].studied).toBe(true)
    expect(cells[3].isToday).toBe(true)
    expect(cells.filter((c) => c.isFuture)).toHaveLength(3)
  })
})

describe('calendarCells', () => {
  it('returns whole weeks ending with the current week', () => {
    const weeks = calendarCells([], today, 12)
    expect(weeks).toHaveLength(12)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(weeks[11][3].isToday).toBe(true)
    expect(weeks[0][0].date).toBe('2026-07-13')
  })
})

describe('wordCounts', () => {
  const w = (id: string): Word => ({ id, word: id, pos: 'noun', meaning: '뜻', example: id, exampleKo: '', level: 1 })
  it('splits words into fresh, learning, and mastered', () => {
    const states = {
      a: { box: 2, due: today, correct: 1, wrong: 0, mastered: false },
      b: { box: 7, due: today, correct: 7, wrong: 0, mastered: true },
    }
    expect(wordCounts([w('a'), w('b'), w('c')], states)).toEqual({ fresh: 1, learning: 1, mastered: 1 })
  })
})

describe('newRemaining', () => {
  it('subtracts words already introduced today', () => {
    expect(newRemaining({ [today]: 4 }, today, 10)).toBe(6)
    expect(newRemaining({ [today]: 12 }, today, 10)).toBe(0)
    expect(newRemaining({}, today, 10)).toBe(10)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/progress.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

File: `src/lib/progress.ts`
```ts
import type { Word } from '../content/types.ts'
import { addDays, diffDays, parseDayKey } from './date.ts'
import type { WordState } from './srs.ts'

export const XP = { wordCorrect: 2, sentencePass: 5, lessonComplete: 20, tutorTurn: 3 } as const
export const DAILY_GOALS = [30, 50, 100] as const
export const NEW_PER_DAY_OPTIONS = [5, 10, 15, 20] as const

/** Consecutive study days ending today, or ending yesterday while today is still open. */
export function currentStreak(studyDays: readonly string[], today: string): number {
  const days = new Set(studyDays)
  let cursor = days.has(today) ? today : addDays(today, -1)
  let count = 0
  while (days.has(cursor)) {
    count++
    cursor = addDays(cursor, -1)
  }
  return count
}

export function longestStreak(studyDays: readonly string[]): number {
  const sorted = [...new Set(studyDays)].sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const day of sorted) {
    run = prev !== null && diffDays(prev, day) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = day
  }
  return best
}

export interface DayCell {
  date: string
  studied: boolean
  isToday: boolean
  isFuture: boolean
}

function mondayOf(day: string): string {
  return addDays(day, -((parseDayKey(day).getDay() + 6) % 7))
}

function cell(date: string, studied: Set<string>, today: string): DayCell {
  return { date, studied: studied.has(date), isToday: date === today, isFuture: date > today }
}

/** The Monday-first week that contains today. */
export function weekCells(studyDays: readonly string[], today: string): DayCell[] {
  const set = new Set(studyDays)
  const monday = mondayOf(today)
  return Array.from({ length: 7 }, (_, i) => cell(addDays(monday, i), set, today))
}

/** `weeks` Monday-first weeks, oldest first, ending with the current week. */
export function calendarCells(studyDays: readonly string[], today: string, weeks = 12): DayCell[][] {
  const set = new Set(studyDays)
  const start = addDays(mondayOf(today), -7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => cell(addDays(start, w * 7 + d), set, today)),
  )
}

export function wordCounts(
  words: readonly Word[],
  states: Readonly<Record<string, WordState>>,
): { fresh: number; learning: number; mastered: number } {
  let fresh = 0
  let learning = 0
  let mastered = 0
  for (const w of words) {
    const s = states[w.id]
    if (!s) fresh++
    else if (s.mastered) mastered++
    else learning++
  }
  return { fresh, learning, mastered }
}

export function newRemaining(newByDay: Readonly<Record<string, number>>, today: string, newPerDay: number): number {
  return Math.max(0, newPerDay - (newByDay[today] ?? 0))
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/progress.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/progress.ts src/lib/progress.test.ts
git commit -m "feat: add XP constants, streaks, calendar and word counts"
```

---

### Task 7: 백업 파일 형식

**Files:**
- Create: `src/lib/backup.ts`
- Test: `src/lib/backup.test.ts`

**Interfaces:**
- Produces: `BACKUP_VERSION = 1`, `interface BackupData { settings: Record<string, unknown>; progress: Record<string, unknown>; tutor: Record<string, unknown> }`, `interface BackupFile extends BackupData { app: 'englishmaster'; version: number; exportedAt: string }`, `createBackup(data, now?)`, `parseBackup(text): { ok: true; backup: BackupFile } | { ok: false; error: string }`, `backupFileName(today)`

- [ ] **Step 1: 실패하는 테스트 작성**

File: `src/lib/backup.test.ts`
```ts
import { describe, expect, it } from 'vitest'
import { backupFileName, createBackup, parseBackup } from './backup.ts'

const data = { settings: { level: 2 }, progress: { words: {} }, tutor: { conversations: [] } }

describe('backup', () => {
  it('round-trips through JSON', () => {
    const file = createBackup(data, new Date('2026-10-02T00:00:00Z'))
    const parsed = parseBackup(JSON.stringify(file))
    expect(parsed).toEqual({ ok: true, backup: file })
    expect(file).toMatchObject({ app: 'englishmaster', version: 1, exportedAt: '2026-10-02T00:00:00.000Z' })
  })

  it('rejects text that is not JSON', () => {
    expect(parseBackup('hello')).toEqual({ ok: false, error: 'JSON 파일이 아니에요.' })
  })

  it('rejects files from other apps or newer versions', () => {
    expect(parseBackup(JSON.stringify({ ...data, app: 'other', version: 1 }))).toMatchObject({ ok: false })
    expect(parseBackup(JSON.stringify({ ...data, app: 'englishmaster', version: 99 }))).toMatchObject({ ok: false })
  })

  it('rejects files with a missing section', () => {
    const broken = { app: 'englishmaster', version: 1, exportedAt: '', settings: {}, progress: {} }
    expect(parseBackup(JSON.stringify(broken))).toEqual({ ok: false, error: '백업 파일 일부가 손상됐어요.' })
  })

  it('names files by day', () => {
    expect(backupFileName('2026-10-02')).toBe('englishmaster-backup-2026-10-02.json')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/backup.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

File: `src/lib/backup.ts`
```ts
export const BACKUP_VERSION = 1

export interface BackupData {
  settings: Record<string, unknown>
  progress: Record<string, unknown>
  tutor: Record<string, unknown>
}

export interface BackupFile extends BackupData {
  app: 'englishmaster'
  version: number
  exportedAt: string
}

export function createBackup(data: BackupData, now: Date = new Date()): BackupFile {
  return { app: 'englishmaster', version: BACKUP_VERSION, exportedAt: now.toISOString(), ...data }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string }

export function parseBackup(text: string): ParseResult {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, error: 'JSON 파일이 아니에요.' }
  }
  if (!isRecord(value) || value.app !== 'englishmaster') return { ok: false, error: 'EnglishMaster 백업 파일이 아니에요.' }
  if (typeof value.version !== 'number' || value.version > BACKUP_VERSION) {
    return { ok: false, error: '이 앱보다 새 버전에서 만든 백업이에요.' }
  }
  if (!isRecord(value.settings) || !isRecord(value.progress) || !isRecord(value.tutor)) {
    return { ok: false, error: '백업 파일 일부가 손상됐어요.' }
  }
  return { ok: true, backup: value as unknown as BackupFile }
}

export function backupFileName(today: string): string {
  return `englishmaster-backup-${today}.json`
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/backup.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/backup.ts src/lib/backup.test.ts
git commit -m "feat: add backup file format and validation"
```

---

### Task 8: AI 모듈 (모델 목록, 프롬프트, OpenRouter 요청, OAuth)

**Files:**
- Create: `src/lib/ai/models.ts`, `src/lib/ai/prompts.ts`, `src/lib/ai/openrouter.ts`, `src/lib/ai/tutor.ts`, `src/lib/ai/oauth.ts`
- Test: `src/lib/ai/prompts.test.ts`, `src/lib/ai/openrouter.test.ts`, `src/lib/ai/tutor.test.ts`, `src/lib/ai/oauth.test.ts`

**Interfaces:**
- Consumes: `normalize` (Task 4), `Level` (Task 5)
- Produces:
  - `interface ModelOption { id; label; vendor; price: { input; output }; reasoning }`, `MODEL_OPTIONS`, `DEFAULT_MODEL`, `reasoningFor(modelId)`, `modelLabel(modelId)`
  - `type TutorContext`, `tutorSystemPrompt(level, context)`, `interface TutorTurn`, `TUTOR_SCHEMA`, `isTutorTurn`, `toCorrection(said, correction): { corrected; explanationKo } | null`, `interface ConversationSummary`, `summarySystemPrompt()`, `SUMMARY_SCHEMA`, `isSummary`
  - `class AiError { kind: AiErrorKind; status }`, `AI_ERROR_MESSAGES`, `errorKindForStatus`, `parseJsonText`, `interface ChatMessage`, `requestJson<T>(req): Promise<JsonResponse<T>>`
  - `interface HistoryItem { role: 'ai' | 'user'; text: string }`, `HISTORY_LIMIT = 16`, `buildTutorMessages`, `transcript`, `requestTutorTurn(args)`, `requestSummary(args)`
  - `VERIFIER_KEY`, `createVerifier`, `challengeFor`, `authorizeUrl`, `exchangeCode`, `beginOAuth(storage, callbackUrl)`, `completeOAuth(search, storage, fetchImpl?): Promise<OAuthResult>`

- [ ] **Step 1: 실패하는 테스트 작성**

File: `src/lib/ai/prompts.test.ts`
```ts
import { describe, expect, it } from 'vitest'
import { isSummary, isTutorTurn, toCorrection, tutorSystemPrompt } from './prompts.ts'

describe('tutorSystemPrompt', () => {
  it('includes the level guide and the free-talk topic', () => {
    const p = tutorSystemPrompt(1, { kind: 'free', topic: 'weekend plans' })
    expect(p).toContain('CEFR A2')
    expect(p).toContain('weekend plans')
  })

  it('includes the role-play role and situation', () => {
    const p = tutorSystemPrompt(3, { kind: 'roleplay', role: 'a hotel clerk', situation: 'check-in' })
    expect(p).toContain('a hotel clerk')
    expect(p).toContain('check-in')
  })
})

describe('isTutorTurn', () => {
  const turn = {
    reply: 'Nice!',
    replyKo: '좋아요!',
    correction: { needed: false, corrected: '', explanationKo: '' },
    hints: ['Yes.', 'No.'],
  }

  it('accepts a complete turn', () => {
    expect(isTutorTurn(turn)).toBe(true)
  })

  it('rejects missing or mistyped fields', () => {
    expect(isTutorTurn({ ...turn, reply: '' })).toBe(false)
    expect(isTutorTurn({ ...turn, hints: 'Yes.' })).toBe(false)
    expect(isTutorTurn({ ...turn, correction: null })).toBe(false)
    expect(isTutorTurn(null)).toBe(false)
  })
})

describe('toCorrection', () => {
  it('returns null when no correction is needed', () => {
    expect(toCorrection('I went home.', { needed: false, corrected: '', explanationKo: '' })).toBeNull()
  })

  it('returns null when the "correction" only changes case or punctuation', () => {
    expect(toCorrection('i went home', { needed: true, corrected: 'I went home.', explanationKo: '...' })).toBeNull()
  })

  it('returns real fixes, including English for Korean input', () => {
    expect(toCorrection('I go home yesterday', { needed: true, corrected: 'I went home yesterday.', explanationKo: '과거형이에요.' })).toEqual({
      corrected: 'I went home yesterday.',
      explanationKo: '과거형이에요.',
    })
    expect(toCorrection('집에 갔어요', { needed: true, corrected: 'I went home.', explanationKo: '이렇게 말해요.' })).not.toBeNull()
  })
})

describe('isSummary', () => {
  it('accepts a complete summary and rejects broken ones', () => {
    const ok = {
      goodPoints: ['질문을 잘했어요.'],
      fixes: [{ original: 'I go', corrected: 'I went', explanationKo: '과거형' }],
      usefulExpressions: [{ en: 'Sounds good.', ko: '좋아요.' }],
    }
    expect(isSummary(ok)).toBe(true)
    expect(isSummary({ ...ok, fixes: [{ original: 'I go' }] })).toBe(false)
    expect(isSummary({ ...ok, usefulExpressions: undefined })).toBe(false)
  })
})
```

File: `src/lib/ai/openrouter.test.ts`
```ts
import { describe, expect, it, vi } from 'vitest'
import { AiError, OPENROUTER_URL, requestJson, type ChatMessage } from './openrouter.ts'
import { isTutorTurn, TUTOR_SCHEMA } from './prompts.ts'

const turn = {
  reply: 'Hi!',
  replyKo: '안녕!',
  correction: { needed: false, corrected: '', explanationKo: '' },
  hints: ['Hello.', 'Hey.'],
}

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const ok = (content: string, cost = 0.0004) =>
  reply(200, { choices: [{ message: { content } }], usage: { cost, prompt_tokens: 120, completion_tokens: 40 } })

function fakeFetch(...responses: (Response | Error)[]) {
  const fn = vi.fn(async () => {
    const next = responses.shift()
    if (!next) throw new Error('no more responses')
    if (next instanceof Error) throw next
    return next
  })
  return fn
}

const request = (fetchImpl: typeof fetch) => ({
  apiKey: 'sk-test',
  model: 'google/gemini-3.8-flash',
  messages: [{ role: 'user', content: 'hi' }] as ChatMessage[],
  schemaName: 'tutor_turn',
  schema: TUTOR_SCHEMA,
  validate: isTutorTurn,
  reasoning: { effort: 'minimal' },
  retryDelayMs: 0,
  fetchImpl,
})

describe('requestJson', () => {
  it('sends a strict JSON-schema request and returns data with cost', async () => {
    const fetchImpl = fakeFetch(ok(JSON.stringify(turn)))
    const res = await requestJson(request(fetchImpl as unknown as typeof fetch))
    expect(res.data).toEqual(turn)
    expect(res.cost).toBe(0.0004)
    expect(res.promptTokens).toBe(120)
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(OPENROUTER_URL)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test')
    const body = JSON.parse(init.body as string)
    expect(body).toMatchObject({
      model: 'google/gemini-3.8-flash',
      max_tokens: 600,
      reasoning: { effort: 'minimal' },
      response_format: { type: 'json_schema', json_schema: { name: 'tutor_turn', strict: true } },
    })
  })

  it('accepts JSON wrapped in a code fence', async () => {
    const fetchImpl = fakeFetch(ok('```json\n' + JSON.stringify(turn) + '\n```'))
    expect((await requestJson(request(fetchImpl as unknown as typeof fetch))).data).toEqual(turn)
  })

  it('does not retry an auth error', async () => {
    const fetchImpl = fakeFetch(reply(401, { error: { message: 'No auth' } }))
    await expect(requestJson(request(fetchImpl as unknown as typeof fetch))).rejects.toMatchObject({ kind: 'auth', status: 401 })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('maps 402 to a credits error', async () => {
    const fetchImpl = fakeFetch(reply(402, { error: { message: 'Insufficient credits' } }))
    await expect(requestJson(request(fetchImpl as unknown as typeof fetch))).rejects.toMatchObject({ kind: 'credits' })
  })

  it('retries a rate limit once', async () => {
    const fetchImpl = fakeFetch(reply(429, {}), ok(JSON.stringify(turn)))
    expect((await requestJson(request(fetchImpl as unknown as typeof fetch))).data).toEqual(turn)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('gives up after a second server error', async () => {
    const fetchImpl = fakeFetch(reply(500, {}), reply(503, {}))
    await expect(requestJson(request(fetchImpl as unknown as typeof fetch))).rejects.toMatchObject({ kind: 'server' })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('reports a format error when the content is not valid JSON or misses fields', async () => {
    const bad = fakeFetch(ok('not json'), ok('{"reply": "Hi"}'))
    await expect(requestJson(request(bad as unknown as typeof fetch))).rejects.toMatchObject({ kind: 'format' })
  })

  it('treats an error object inside a 200 response as an upstream error', async () => {
    const fetchImpl = fakeFetch(reply(200, { error: { code: 502, message: 'Provider down' } }), reply(200, { error: { code: 502 } }))
    await expect(requestJson(request(fetchImpl as unknown as typeof fetch))).rejects.toMatchObject({ kind: 'server' })
  })

  it('reports network failures', async () => {
    const fetchImpl = fakeFetch(new TypeError('Failed to fetch'))
    const err = await requestJson(request(fetchImpl as unknown as typeof fetch)).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AiError)
    expect(err).toMatchObject({ kind: 'network' })
  })

  it('times out a request that never answers', async () => {
    const hanging = ((_url: string, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      })) as unknown as typeof fetch
    await expect(requestJson({ ...request(hanging), timeoutMs: 10 })).rejects.toMatchObject({ kind: 'timeout' })
  })
})
```

File: `src/lib/ai/tutor.test.ts`
```ts
import { describe, expect, it, vi } from 'vitest'
import { buildTutorMessages, requestTutorTurn, transcript } from './tutor.ts'

describe('buildTutorMessages', () => {
  it('starts with the system prompt and a user turn before the AI opening line', () => {
    const msgs = buildTutorMessages('SYS', [
      { role: 'ai', text: 'Hi! Any plans?' },
      { role: 'user', text: 'I go hiking' },
    ])
    expect(msgs.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user'])
    expect(msgs[0].content).toBe('SYS')
    expect(msgs[3].content).toBe('I go hiking')
  })

  it('keeps only the most recent messages', () => {
    const history = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 === 0 ? ('ai' as const) : ('user' as const), text: `m${i}` }))
    const msgs = buildTutorMessages('SYS', history, 16)
    expect(msgs.at(-1)?.content).toBe('m29')
    expect(msgs.filter((m) => m.content.startsWith('m'))).toHaveLength(16)
  })
})

describe('transcript', () => {
  it('labels tutor and learner lines', () => {
    expect(transcript([{ role: 'ai', text: 'Hi' }, { role: 'user', text: 'Hello' }])).toBe('Tutor: Hi\nLearner: Hello')
  })
})

describe('requestTutorTurn', () => {
  it('uses the model’s reasoning setting and the tutor schema', async () => {
    const turn = { reply: 'Cool!', replyKo: '멋져요!', correction: { needed: false, corrected: '', explanationKo: '' }, hints: ['a', 'b'] }
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(turn) } }], usage: { cost: 0.001 } }), { status: 200 }),
    )
    const res = await requestTutorTurn({
      apiKey: 'k',
      model: 'openai/gpt-6-luna',
      level: 2,
      context: { kind: 'free', topic: 'food' },
      history: [{ role: 'ai', text: 'Hi' }, { role: 'user', text: 'Hello' }],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(res.data.reply).toBe('Cool!')
    const body = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body.reasoning).toEqual({ effort: 'none' })
    expect(body.response_format.json_schema.name).toBe('tutor_turn')
  })
})
```

File: `src/lib/ai/oauth.test.ts`
```ts
import { describe, expect, it, vi } from 'vitest'
import { authorizeUrl, beginOAuth, challengeFor, completeOAuth, createVerifier, exchangeCode, VERIFIER_KEY } from './oauth.ts'

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => {
      map.delete(k)
    },
    setItem: (k: string, v: string) => {
      map.set(k, String(v))
    },
  }
}

const keyResponse = () => new Response(JSON.stringify({ key: 'sk-or-v1-abc' }), { status: 200 })

describe('PKCE helpers', () => {
  it('derives the RFC 7636 S256 challenge', async () => {
    expect(await challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })

  it('creates a 43-character base64url verifier', () => {
    const v = createVerifier((n) => new Uint8Array(n).fill(255))
    expect(v).toHaveLength(43)
    expect(v).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('builds the authorize URL', () => {
    expect(authorizeUrl('https://busantree.github.io/englishmaster/', 'abc')).toBe(
      'https://openrouter.ai/auth?callback_url=https%3A%2F%2Fbusantree.github.io%2Fenglishmaster%2F&code_challenge=abc&code_challenge_method=S256',
    )
  })
})

describe('exchangeCode', () => {
  it('returns the key', async () => {
    const fetchImpl = vi.fn(async () => keyResponse())
    expect(await exchangeCode('code', 'verifier', fetchImpl as unknown as typeof fetch)).toBe('sk-or-v1-abc')
    const body = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body).toEqual({ code: 'code', code_verifier: 'verifier', code_challenge_method: 'S256' })
  })

  it('throws on a rejected code', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"error":{"message":"bad"}}', { status: 400 }))
    await expect(exchangeCode('code', 'v', fetchImpl as unknown as typeof fetch)).rejects.toMatchObject({ kind: 'bad-request' })
  })
})

describe('beginOAuth / completeOAuth', () => {
  it('stores the verifier and points to OpenRouter', async () => {
    const storage = memoryStorage()
    const url = await beginOAuth(storage, 'https://busantree.github.io/englishmaster/')
    const verifier = storage.getItem(VERIFIER_KEY)!
    expect(url).toContain(`code_challenge=${await challengeFor(verifier)}`)
  })

  it('does nothing without a code', async () => {
    expect(await completeOAuth('', memoryStorage())).toEqual({ status: 'none' })
  })

  it('fails clearly when the verifier is missing', async () => {
    const fetchImpl = vi.fn()
    const result = await completeOAuth('?code=xyz', memoryStorage(), fetchImpl as unknown as typeof fetch)
    expect(result).toMatchObject({ status: 'error' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('exchanges the code and forgets the verifier', async () => {
    const storage = memoryStorage()
    storage.setItem(VERIFIER_KEY, 'verifier')
    const fetchImpl = vi.fn(async () => keyResponse())
    expect(await completeOAuth('?code=xyz', storage, fetchImpl as unknown as typeof fetch)).toEqual({ status: 'ok', key: 'sk-or-v1-abc' })
    expect(storage.getItem(VERIFIER_KEY)).toBeNull()
  })

  it('reports a failed exchange', async () => {
    const storage = memoryStorage()
    storage.setItem(VERIFIER_KEY, 'verifier')
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 403 }))
    expect(await completeOAuth('?code=xyz', storage, fetchImpl as unknown as typeof fetch)).toMatchObject({ status: 'error' })
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/ai`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

File: `src/lib/ai/models.ts`
```ts
export interface ModelOption {
  id: string
  label: string
  vendor: 'OpenAI' | 'Google' | 'Anthropic'
  /** USD per 1M tokens, OpenRouter list price on 2026-10-02. */
  price: { input: number; output: number }
  /** OpenRouter `reasoning` parameter that keeps conversation replies fast. */
  reasoning: Record<string, unknown>
}

export const MODEL_OPTIONS: ModelOption[] = [
  { id: 'google/gemini-3.8-flash', label: 'Gemini 3.8 Flash', vendor: 'Google', price: { input: 0.75, output: 3.75 }, reasoning: { effort: 'minimal' } },
  { id: 'openai/gpt-6-luna', label: 'GPT-6 Luna', vendor: 'OpenAI', price: { input: 0.1, output: 0.5 }, reasoning: { effort: 'none' } },
  { id: 'openai/gpt-5.6-luna', label: 'GPT-5.6 Luna', vendor: 'OpenAI', price: { input: 0.2, output: 1.2 }, reasoning: { effort: 'none' } },
  { id: 'openai/gpt-5.4-mini', label: 'GPT-5.4 mini', vendor: 'OpenAI', price: { input: 0.75, output: 4.5 }, reasoning: { effort: 'none' } },
  { id: 'google/gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', vendor: 'Google', price: { input: 0.3, output: 2.5 }, reasoning: { effort: 'minimal' } },
  { id: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5', vendor: 'Anthropic', price: { input: 1, output: 5 }, reasoning: { enabled: false } },
  { id: 'anthropic/claude-sonnet-5.5', label: 'Claude Sonnet 5.5', vendor: 'Anthropic', price: { input: 2, output: 10 }, reasoning: { effort: 'low' } },
]

/** Provisional until the benchmark in scripts/bench-models.ts runs with a real key. */
export const DEFAULT_MODEL = 'google/gemini-3.8-flash'

export function reasoningFor(modelId: string): Record<string, unknown> | undefined {
  return MODEL_OPTIONS.find((m) => m.id === modelId)?.reasoning
}

export function modelLabel(modelId: string): string {
  return MODEL_OPTIONS.find((m) => m.id === modelId)?.label ?? modelId
}
```

File: `src/lib/ai/prompts.ts`
```ts
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
```

File: `src/lib/ai/openrouter.ts`
```ts
export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export type AiErrorKind = 'auth' | 'credits' | 'rate' | 'server' | 'network' | 'timeout' | 'format' | 'bad-request'

export class AiError extends Error {
  readonly kind: AiErrorKind
  readonly status: number | undefined

  constructor(kind: AiErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'AiError'
    this.kind = kind
    this.status = status
  }
}

export const AI_ERROR_MESSAGES: Record<AiErrorKind, string> = {
  auth: '연결이 만료됐어요. 설정에서 OpenRouter를 다시 연결해 주세요.',
  credits: 'OpenRouter 크레딧이 부족해요. 충전한 뒤 다시 시도해 주세요.',
  rate: '요청이 많아요. 잠시 후 다시 시도해 주세요.',
  server: 'AI 서버에 문제가 있어요. 잠시 후 다시 시도해 주세요.',
  network: '인터넷 연결을 확인해 주세요.',
  timeout: 'AI 응답이 너무 늦어요. 다시 보내 볼까요?',
  format: 'AI 응답을 읽지 못했어요. 다시 시도해 주세요.',
  'bad-request': '요청이 거절됐어요. 설정에서 다른 모델을 골라 보세요.',
}

export function errorKindForStatus(status: number): AiErrorKind {
  if (status === 401 || status === 403) return 'auth'
  if (status === 402) return 'credits'
  if (status === 408) return 'timeout'
  if (status === 429) return 'rate'
  if (status >= 500) return 'server'
  return 'bad-request'
}

/** Parses model output as JSON, tolerating a ```json fence or text around the object. */
export function parseJsonText(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1))
      } catch {
        // fall through
      }
    }
  }
  throw new AiError('format', 'Response was not valid JSON')
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface JsonRequest<T> {
  apiKey: string
  model: string
  messages: ChatMessage[]
  schemaName: string
  schema: Record<string, unknown>
  validate: (value: unknown) => value is T
  reasoning?: Record<string, unknown>
  maxTokens?: number
  appUrl?: string
  timeoutMs?: number
  retries?: number
  retryDelayMs?: number
  fetchImpl?: typeof fetch
}

export interface JsonResponse<T> {
  data: T
  /** USD charged by OpenRouter for this request. */
  cost: number
  latencyMs: number
  promptTokens: number
  completionTokens: number
}

interface CompletionBody {
  choices?: { message?: { content?: unknown } }[]
  usage?: { cost?: number; prompt_tokens?: number; completion_tokens?: number }
  error?: { code?: number; message?: string }
}

async function requestOnce<T>(req: JsonRequest<T>): Promise<JsonResponse<T>> {
  const fetchImpl = req.fetchImpl ?? fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 25_000)
  const started = Date.now()
  try {
    const res = await fetchImpl(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${req.apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'EnglishMaster',
        ...(req.appUrl ? { 'HTTP-Referer': req.appUrl } : {}),
      },
      body: JSON.stringify({
        model: req.model,
        messages: req.messages,
        max_tokens: req.maxTokens ?? 600,
        response_format: { type: 'json_schema', json_schema: { name: req.schemaName, strict: true, schema: req.schema } },
        ...(req.reasoning ? { reasoning: req.reasoning } : {}),
      }),
    })
    const body = (await res.json().catch(() => null)) as CompletionBody | null
    if (!res.ok) throw new AiError(errorKindForStatus(res.status), body?.error?.message ?? `HTTP ${res.status}`, res.status)
    if (body?.error) {
      const status = body.error.code ?? 502
      throw new AiError(errorKindForStatus(status), body.error.message ?? 'Upstream error', status)
    }
    const content = body?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) throw new AiError('format', 'Empty response')
    const data = parseJsonText(content)
    if (!req.validate(data)) throw new AiError('format', 'Response did not match the schema')
    return {
      data,
      cost: body?.usage?.cost ?? 0,
      latencyMs: Date.now() - started,
      promptTokens: body?.usage?.prompt_tokens ?? 0,
      completionTokens: body?.usage?.completion_tokens ?? 0,
    }
  } catch (err) {
    if (err instanceof AiError) throw err
    if (controller.signal.aborted) throw new AiError('timeout', 'Request timed out')
    throw new AiError('network', err instanceof Error ? err.message : 'Network error')
  } finally {
    clearTimeout(timer)
  }
}

const RETRYABLE: readonly AiErrorKind[] = ['rate', 'server', 'format']

/** One request plus one retry for rate limits, server errors, and malformed output. */
export async function requestJson<T>(req: JsonRequest<T>): Promise<JsonResponse<T>> {
  const retries = req.retries ?? 1
  try {
    return await requestOnce(req)
  } catch (err) {
    if (retries > 0 && err instanceof AiError && RETRYABLE.includes(err.kind)) {
      await new Promise((resolve) => setTimeout(resolve, req.retryDelayMs ?? 800))
      return requestJson({ ...req, retries: retries - 1 })
    }
    throw err
  }
}
```

File: `src/lib/ai/tutor.ts`
```ts
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
```

File: `src/lib/ai/oauth.ts`
```ts
import { AiError, errorKindForStatus } from './openrouter.ts'

const AUTH_URL = 'https://openrouter.ai/auth'
const KEYS_URL = 'https://openrouter.ai/api/v1/auth/keys'
export const VERIFIER_KEY = 'em:oauth-verifier'

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function createVerifier(
  randomBytes: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n)),
): string {
  return base64Url(randomBytes(32))
}

export async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64Url(new Uint8Array(digest))
}

export function authorizeUrl(callbackUrl: string, challenge: string): string {
  const params = new URLSearchParams({ callback_url: callbackUrl, code_challenge: challenge, code_challenge_method: 'S256' })
  return `${AUTH_URL}?${params}`
}

export async function exchangeCode(code: string, verifier: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  let res: Response
  try {
    res = await fetchImpl(KEYS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' }),
    })
  } catch {
    throw new AiError('network', 'Network error')
  }
  const body = (await res.json().catch(() => null)) as { key?: unknown } | null
  if (!res.ok) throw new AiError(errorKindForStatus(res.status), 'Key exchange failed', res.status)
  if (typeof body?.key !== 'string' || !body.key) throw new AiError('format', 'No key in response')
  return body.key
}

/** Saves a fresh verifier and returns the OpenRouter URL to open. */
export async function beginOAuth(storage: Storage, callbackUrl: string): Promise<string> {
  const verifier = createVerifier()
  storage.setItem(VERIFIER_KEY, verifier)
  return authorizeUrl(callbackUrl, await challengeFor(verifier))
}

export type OAuthResult = { status: 'none' } | { status: 'ok'; key: string } | { status: 'error'; message: string }

/** Finishes the flow when the app is opened with ?code=… after OpenRouter redirects back. */
export async function completeOAuth(search: string, storage: Storage, fetchImpl: typeof fetch = fetch): Promise<OAuthResult> {
  const code = new URLSearchParams(search).get('code')
  if (!code) return { status: 'none' }
  const verifier = storage.getItem(VERIFIER_KEY)
  storage.removeItem(VERIFIER_KEY)
  if (!verifier) return { status: 'error', message: '연결을 시작한 앱에서 다시 시도해 주세요.' }
  try {
    return { status: 'ok', key: await exchangeCode(code, verifier, fetchImpl) }
  } catch {
    return { status: 'error', message: 'OpenRouter 연결에 실패했어요. 다시 시도해 주세요.' }
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/ai`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai
git commit -m "feat: add OpenRouter client, tutor prompts, and OAuth PKCE"
```

---

### Task 9: 스토어 (설정, 진도, 튜터, 백업, 토스트)

**Files:**
- Create: `src/store/settings.ts`, `src/store/progress.ts`, `src/store/tutor.ts`, `src/store/backup.ts`, `src/store/toast.ts`
- Test: `src/store/stores.test.ts`

**Interfaces:**
- Consumes: `applyAnswer`, `WordState` (Task 3), `XP` (Task 6), `createBackup`, `BackupFile` (Task 7), `DEFAULT_MODEL`, `ConversationSummary` (Task 8), `Level` (Task 5)
- Produces:
  - `interface Settings { onboarded; level: Level; dailyGoal; newPerDay; ttsRate; voiceURI: string | null; autoPlay }`, `DEFAULT_SETTINGS`, `useSettings` (+ `update(patch)`, `replace(settings)`, `reset()`), `pickSettings(state): Settings`
  - `interface LessonRecord { completedAt; bestScore }`, `interface ProgressData { words; lessons; xpByDay; studyDays; newByDay }`, `EMPTY_PROGRESS`, `useProgress` (+ `answerWord(wordId, correct, today): number`, `addXp(amount, today)`, `markStudied(today)`, `completeLesson(lessonId, score, today)`, `replace(data)`, `reset()`), `pickProgress(state): ProgressData`
  - `interface Correction`, `interface TutorMessage`, `interface Conversation`, `MAX_CONVERSATIONS = 30`, `useTutor` (+ `setApiKey`, `setModel`, `start(conversation)`, `addMessage(id, message)`, `setCorrection(id, messageId, correction)`, `addCost(id, cost)`, `finish(id, endedAt, summary?)`, `remove(id)`, `replaceHistory(model, conversations)`)
  - `exportBackup(now?): BackupFile`, `importBackup(backup: BackupFile): void`
  - `useToast` (+ `show(message)`, `clear()`)

- [ ] **Step 1: 실패하는 테스트 작성**

File: `src/store/stores.test.ts`
```ts
// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { exportBackup, importBackup } from './backup.ts'
import { EMPTY_PROGRESS, useProgress } from './progress.ts'
import { DEFAULT_SETTINGS, useSettings } from './settings.ts'
import { MAX_CONVERSATIONS, useTutor, type Conversation } from './tutor.ts'

const conv = (id: string): Conversation => ({
  id,
  kind: 'free',
  refId: 'today',
  title: '오늘 하루',
  startedAt: '2026-10-02T00:00:00.000Z',
  messages: [{ id: `${id}-0`, role: 'ai', text: 'Hi!' }],
  cost: 0,
})

beforeEach(() => {
  localStorage.clear()
  useProgress.setState({ ...EMPTY_PROGRESS })
  useSettings.setState({ ...DEFAULT_SETTINGS })
  useTutor.setState({ apiKey: null, model: 'google/gemini-3.8-flash', conversations: [] })
})

describe('progress store', () => {
  it('records a new word, counts it as new today, and returns XP', () => {
    const xp = useProgress.getState().answerWord('apple', true, '2026-10-02')
    const s = useProgress.getState()
    expect(xp).toBe(2)
    expect(s.words.apple).toMatchObject({ box: 1, due: '2026-10-03' })
    expect(s.newByDay['2026-10-02']).toBe(1)
    expect(s.xpByDay['2026-10-02']).toBe(2)
  })

  it('does not count a review as a new word and gives no XP for a wrong answer', () => {
    useProgress.getState().answerWord('apple', true, '2026-10-02')
    const xp = useProgress.getState().answerWord('apple', false, '2026-10-03')
    const s = useProgress.getState()
    expect(xp).toBe(0)
    expect(s.newByDay['2026-10-03']).toBeUndefined()
    expect(s.words.apple).toMatchObject({ box: 1, wrong: 1 })
  })

  it('writes to the day of each action when the date changes mid-session', () => {
    const { answerWord, markStudied } = useProgress.getState()
    answerWord('apple', true, '2026-10-02')
    answerWord('book', true, '2026-10-03')
    markStudied('2026-10-03')
    markStudied('2026-10-03')
    const s = useProgress.getState()
    expect(s.xpByDay).toEqual({ '2026-10-02': 2, '2026-10-03': 2 })
    expect(s.newByDay).toEqual({ '2026-10-02': 1, '2026-10-03': 1 })
    expect(s.studyDays).toEqual(['2026-10-03'])
  })

  it('keeps the best lesson score and marks the day studied once', () => {
    const { completeLesson } = useProgress.getState()
    completeLesson('daily-1', 70, '2026-10-02')
    completeLesson('daily-1', 90, '2026-10-02')
    completeLesson('daily-1', 60, '2026-10-02')
    const s = useProgress.getState()
    expect(s.lessons['daily-1'].bestScore).toBe(90)
    expect(s.studyDays).toEqual(['2026-10-02'])
    expect(s.xpByDay['2026-10-02']).toBe(60)
  })

  it('persists to localStorage under em:progress', () => {
    useProgress.getState().markStudied('2026-10-02')
    expect(localStorage.getItem('em:progress')).toContain('2026-10-02')
  })
})

describe('tutor store', () => {
  it('keeps the newest conversations first, up to the limit', () => {
    for (let i = 0; i < MAX_CONVERSATIONS + 2; i++) useTutor.getState().start(conv(`c${i}`))
    const list = useTutor.getState().conversations
    expect(list).toHaveLength(MAX_CONVERSATIONS)
    expect(list[0].id).toBe(`c${MAX_CONVERSATIONS + 1}`)
  })

  it('adds messages, corrections, cost, and a summary', () => {
    const t = useTutor.getState()
    t.start(conv('a'))
    t.addMessage('a', { id: 'u1', role: 'user', text: 'I go yesterday' })
    t.setCorrection('a', 'u1', { corrected: 'I went yesterday.', explanationKo: '과거형이에요.' })
    t.addMessage('a', { id: 'a1', role: 'ai', text: 'Where did you go?', textKo: '어디 갔어요?', hints: ['To the park.'] })
    t.addCost('a', 0.001)
    t.addCost('a', 0.002)
    t.finish('a', '2026-10-02T01:00:00.000Z', { goodPoints: ['좋아요'], fixes: [], usefulExpressions: [] })
    const c = useTutor.getState().conversations[0]
    expect(c.messages.map((m) => m.id)).toEqual(['a-0', 'u1', 'a1'])
    expect(c.messages[1].correction).toEqual({ corrected: 'I went yesterday.', explanationKo: '과거형이에요.' })
    expect(c.cost).toBeCloseTo(0.003)
    expect(c.endedAt).toBe('2026-10-02T01:00:00.000Z')
    expect(c.summary?.goodPoints).toEqual(['좋아요'])
  })
})

describe('backup', () => {
  it('exports everything except the API key and restores it', () => {
    useTutor.getState().setApiKey('sk-or-secret')
    useTutor.getState().start(conv('a'))
    useSettings.getState().update({ level: 3, onboarded: true })
    useProgress.getState().answerWord('apple', true, '2026-10-02')
    const file = exportBackup(new Date('2026-10-02T00:00:00Z'))
    expect(JSON.stringify(file)).not.toContain('sk-or-secret')

    useProgress.getState().reset()
    useSettings.getState().reset()
    useTutor.getState().replaceHistory('openai/gpt-6-luna', [])
    importBackup(JSON.parse(JSON.stringify(file)))

    expect(useSettings.getState().level).toBe(3)
    expect(useProgress.getState().words.apple).toBeDefined()
    expect(useTutor.getState().conversations.map((c) => c.id)).toEqual(['a'])
    expect(useTutor.getState().model).toBe('google/gemini-3.8-flash')
    expect(useTutor.getState().apiKey).toBe('sk-or-secret')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/store`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

File: `src/store/settings.ts`
```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Level } from '../content/types.ts'

export interface Settings {
  onboarded: boolean
  level: Level
  dailyGoal: number
  newPerDay: number
  /** speechSynthesis rate, 0.7..1.2 */
  ttsRate: number
  /** Chosen English voice; null picks a Google en-US voice automatically. */
  voiceURI: string | null
  /** Read AI tutor replies aloud as they arrive. */
  autoPlay: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  level: 1,
  dailyGoal: 50,
  newPerDay: 10,
  ttsRate: 1,
  voiceURI: null,
  autoPlay: true,
}

interface SettingsStore extends Settings {
  update: (patch: Partial<Settings>) => void
  replace: (settings: Settings) => void
  reset: () => void
}

export function pickSettings(s: Settings): Settings {
  return {
    onboarded: s.onboarded,
    level: s.level,
    dailyGoal: s.dailyGoal,
    newPerDay: s.newPerDay,
    ttsRate: s.ttsRate,
    voiceURI: s.voiceURI,
    autoPlay: s.autoPlay,
  }
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      replace: (settings) => set(pickSettings({ ...DEFAULT_SETTINGS, ...settings })),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    { name: 'em:settings', version: 1 },
  ),
)
```

File: `src/store/progress.ts`
```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { XP } from '../lib/progress.ts'
import { applyAnswer, type WordState } from '../lib/srs.ts'

export interface LessonRecord {
  completedAt: string
  bestScore: number
}

export interface ProgressData {
  words: Record<string, WordState>
  lessons: Record<string, LessonRecord>
  xpByDay: Record<string, number>
  studyDays: string[]
  /** New words introduced per day, for the daily new-word limit. */
  newByDay: Record<string, number>
}

export const EMPTY_PROGRESS: ProgressData = { words: {}, lessons: {}, xpByDay: {}, studyDays: [], newByDay: {} }

interface ProgressStore extends ProgressData {
  /** Applies the first answer to a quiz item and returns the XP earned. */
  answerWord: (wordId: string, correct: boolean, today: string) => number
  addXp: (amount: number, today: string) => void
  markStudied: (today: string) => void
  completeLesson: (lessonId: string, score: number, today: string) => void
  replace: (data: ProgressData) => void
  reset: () => void
}

export function pickProgress(s: ProgressData): ProgressData {
  return { words: s.words, lessons: s.lessons, xpByDay: s.xpByDay, studyDays: s.studyDays, newByDay: s.newByDay }
}

function plusXp(xpByDay: Record<string, number>, today: string, amount: number): Record<string, number> {
  return amount ? { ...xpByDay, [today]: (xpByDay[today] ?? 0) + amount } : xpByDay
}

function withDay(days: string[], today: string): string[] {
  return days.includes(today) ? days : [...days, today]
}

export const useProgress = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...EMPTY_PROGRESS,
      answerWord: (wordId, correct, today) => {
        const prev = get().words[wordId]
        const xp = correct ? XP.wordCorrect : 0
        set((s) => ({
          words: { ...s.words, [wordId]: applyAnswer(prev, correct, today) },
          newByDay: prev ? s.newByDay : { ...s.newByDay, [today]: (s.newByDay[today] ?? 0) + 1 },
          xpByDay: plusXp(s.xpByDay, today, xp),
        }))
        return xp
      },
      addXp: (amount, today) => set((s) => ({ xpByDay: plusXp(s.xpByDay, today, amount) })),
      markStudied: (today) => set((s) => ({ studyDays: withDay(s.studyDays, today) })),
      completeLesson: (lessonId, score, today) =>
        set((s) => ({
          lessons: {
            ...s.lessons,
            [lessonId]: { completedAt: today, bestScore: Math.max(s.lessons[lessonId]?.bestScore ?? 0, score) },
          },
          xpByDay: plusXp(s.xpByDay, today, XP.lessonComplete),
          studyDays: withDay(s.studyDays, today),
        })),
      replace: (data) => set(pickProgress({ ...EMPTY_PROGRESS, ...data })),
      reset: () => set(EMPTY_PROGRESS),
    }),
    { name: 'em:progress', version: 1 },
  ),
)
```

File: `src/store/tutor.ts`
```ts
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
```

File: `src/store/backup.ts`
```ts
import { createBackup, type BackupFile } from '../lib/backup.ts'
import { EMPTY_PROGRESS, pickProgress, useProgress, type ProgressData } from './progress.ts'
import { DEFAULT_SETTINGS, pickSettings, useSettings, type Settings } from './settings.ts'
import { useTutor, type Conversation } from './tutor.ts'

/** Everything worth keeping, except the OpenRouter key. */
export function exportBackup(now: Date = new Date()): BackupFile {
  const tutor = useTutor.getState()
  return createBackup(
    {
      settings: { ...pickSettings(useSettings.getState()) },
      progress: { ...pickProgress(useProgress.getState()) },
      tutor: { model: tutor.model, conversations: tutor.conversations },
    },
    now,
  )
}

export function importBackup(backup: BackupFile): void {
  useSettings.getState().replace({ ...DEFAULT_SETTINGS, ...(backup.settings as Partial<Settings>), onboarded: true })
  useProgress.getState().replace({ ...EMPTY_PROGRESS, ...(backup.progress as Partial<ProgressData>) })
  const { model, conversations } = backup.tutor as { model?: unknown; conversations?: unknown }
  useTutor
    .getState()
    .replaceHistory(
      typeof model === 'string' ? model : useTutor.getState().model,
      Array.isArray(conversations) ? (conversations as Conversation[]) : [],
    )
}
```

File: `src/store/toast.ts`
```ts
import { create } from 'zustand'

interface ToastStore {
  message: string | null
  show: (message: string) => void
  clear: () => void
}

export const useToast = create<ToastStore>()((set) => ({
  message: null,
  show: (message) => set({ message }),
  clear: () => set({ message: null }),
}))
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/store`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store
git commit -m "feat: add persisted settings, progress, and tutor stores with backup"
```

---

### Task 10: 음성 (인식 컨트롤러, 훅, 발음 재생)

**Files:**
- Create: `src/speech/recognizer.ts`, `src/speech/useSpeechRecognition.ts`, `src/speech/tts.ts`, `src/speech/useSpeak.ts`
- Test: `src/speech/recognizer.test.ts`

**Interfaces:**
- Consumes: `useSettings` (Task 9)
- Produces:
  - `type RecognizerStatus = 'idle' | 'listening'`, `type RecognizerError = 'not-allowed' | 'no-speech' | 'network' | 'unsupported' | 'other'`, `class Recognizer { supported; start(); stop(); abort() }`, `getRecognitionCtor()`
  - `useSpeechRecognition(onFinal): { supported; status; interim; error; start; stop }`
  - `ttsSupported()`, `loadVoices(): Promise<SpeechSynthesisVoice[]>`, `englishVoices(voices)`, `pickVoice(voices, preferredURI)`, `speak(text, { rate?, voiceURI?, onEnd? })`, `stopSpeaking()`
  - `useSpeak(): (text: string, options?: { slow?: boolean; onEnd?: () => void }) => void`

- [ ] **Step 1: 실패하는 테스트 작성**

File: `src/speech/recognizer.test.ts`
```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { Recognizer, type RecognitionLike, type RecognizerCallbacks, type RecognizerError, type RecognizerStatus } from './recognizer.ts'

class FakeRecognition implements RecognitionLike {
  static instances: FakeRecognition[] = []
  lang = ''
  interimResults = false
  maxAlternatives = 1
  continuous = true
  onresult: RecognitionLike['onresult'] = null
  onerror: RecognitionLike['onerror'] = null
  onend: RecognitionLike['onend'] = null
  aborted = false
  stopped = false

  constructor() {
    FakeRecognition.instances.push(this)
  }

  start() {}

  stop() {
    this.stopped = true
  }

  abort() {
    this.aborted = true
  }

  emit(alternatives: string[], isFinal: boolean) {
    const result = Object.assign(alternatives.map((transcript) => ({ transcript })), { isFinal })
    this.onresult?.({ resultIndex: 0, results: [result] })
  }
}

let statuses: RecognizerStatus[]
let interims: string[]
let finals: string[][]
let errors: RecognizerError[]
let callbacks: RecognizerCallbacks

beforeEach(() => {
  FakeRecognition.instances = []
  statuses = []
  interims = []
  finals = []
  errors = []
  callbacks = {
    onStatus: (s) => statuses.push(s),
    onInterim: (t) => interims.push(t),
    onFinal: (a) => finals.push(a),
    onError: (e) => errors.push(e),
  }
})

describe('Recognizer', () => {
  it('reports unsupported browsers', () => {
    const r = new Recognizer(callbacks, null)
    expect(r.supported).toBe(false)
    r.start()
    expect(errors).toEqual(['unsupported'])
  })

  it('configures English recognition with alternatives and starts listening', () => {
    new Recognizer(callbacks, FakeRecognition).start()
    const rec = FakeRecognition.instances[0]
    expect(rec).toMatchObject({ lang: 'en-US', interimResults: true, maxAlternatives: 3, continuous: false })
    expect(statuses).toEqual(['listening'])
  })

  it('streams interim text, delivers the final alternatives once, then goes idle', () => {
    new Recognizer(callbacks, FakeRecognition).start()
    const rec = FakeRecognition.instances[0]
    rec.emit(['hello wor'], false)
    rec.emit(['hello world', 'hello word'], true)
    rec.emit(['hello world again'], true)
    rec.onend?.()
    expect(interims).toEqual(['hello wor'])
    expect(finals).toEqual([['hello world', 'hello word']])
    expect(statuses).toEqual(['listening', 'idle'])
  })

  it('goes idle without a result when nothing was heard', () => {
    new Recognizer(callbacks, FakeRecognition).start()
    FakeRecognition.instances[0].onend?.()
    expect(finals).toEqual([])
    expect(statuses).toEqual(['listening', 'idle'])
  })

  it('maps browser errors and ignores aborts', () => {
    new Recognizer(callbacks, FakeRecognition).start()
    const rec = FakeRecognition.instances[0]
    rec.onerror?.({ error: 'not-allowed' })
    rec.onerror?.({ error: 'aborted' })
    rec.onerror?.({ error: 'no-speech' })
    rec.onerror?.({ error: 'weird' })
    expect(errors).toEqual(['not-allowed', 'no-speech', 'other'])
  })

  it('abandons the previous session when started twice', () => {
    const r = new Recognizer(callbacks, FakeRecognition)
    r.start()
    r.start()
    const [first, second] = FakeRecognition.instances
    expect(first.aborted).toBe(true)
    first.emit(['old'], true)
    second.emit(['new'], true)
    expect(finals).toEqual([['new']])
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/speech`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

File: `src/speech/recognizer.ts`
```ts
export interface RecognitionAlternativeLike {
  transcript: string
}

export interface RecognitionEventLike {
  resultIndex: number
  results: ArrayLike<ArrayLike<RecognitionAlternativeLike> & { isFinal: boolean }>
}

/** The parts of the Web Speech API's SpeechRecognition this app uses. */
export interface RecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  onresult: ((event: RecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

export type RecognitionCtor = new () => RecognitionLike
export type RecognizerStatus = 'idle' | 'listening'
export type RecognizerError = 'not-allowed' | 'no-speech' | 'network' | 'unsupported' | 'other'

export interface RecognizerCallbacks {
  onStatus: (status: RecognizerStatus) => void
  onInterim: (text: string) => void
  onFinal: (alternatives: string[]) => void
  onError: (error: RecognizerError) => void
}

const ERRORS: Record<string, RecognizerError> = {
  'not-allowed': 'not-allowed',
  'service-not-allowed': 'not-allowed',
  'audio-capture': 'not-allowed',
  'no-speech': 'no-speech',
  network: 'network',
}

export function getRecognitionCtor(): RecognitionCtor | null {
  const w = globalThis as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** One-utterance English recognition with interim text and up to three alternatives. */
export class Recognizer {
  private rec: RecognitionLike | null = null
  private readonly ctor: RecognitionCtor | null
  private readonly cb: RecognizerCallbacks

  constructor(callbacks: RecognizerCallbacks, ctor: RecognitionCtor | null = getRecognitionCtor()) {
    this.cb = callbacks
    this.ctor = ctor
  }

  get supported(): boolean {
    return this.ctor !== null
  }

  start(): void {
    if (!this.ctor) {
      this.cb.onError('unsupported')
      return
    }
    this.abort()
    const rec = new this.ctor()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.maxAlternatives = 3
    rec.continuous = false
    let delivered = false
    rec.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          const alternatives = Array.from(result, (alt) => alt.transcript.trim()).filter(Boolean)
          if (alternatives.length && !delivered) {
            delivered = true
            this.cb.onFinal(alternatives)
          }
        } else {
          interim += result[0]?.transcript ?? ''
        }
      }
      if (interim.trim()) this.cb.onInterim(interim.trim())
    }
    rec.onerror = (event) => {
      if (event.error === 'aborted') return
      this.cb.onError(ERRORS[event.error] ?? 'other')
    }
    rec.onend = () => {
      if (this.rec !== rec) return
      this.rec = null
      this.cb.onStatus('idle')
    }
    this.rec = rec
    try {
      rec.start()
      this.cb.onStatus('listening')
    } catch {
      this.rec = null
      this.cb.onStatus('idle')
      this.cb.onError('other')
    }
  }

  /** Stops listening; a final result may still arrive. */
  stop(): void {
    this.rec?.stop()
  }

  /** Stops listening and drops any pending result. */
  abort(): void {
    const rec = this.rec
    if (!rec) return
    this.rec = null
    rec.onresult = null
    rec.onerror = null
    rec.onend = null
    rec.abort()
    this.cb.onStatus('idle')
  }
}
```

File: `src/speech/useSpeechRecognition.ts`
```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { Recognizer, type RecognizerError, type RecognizerStatus } from './recognizer.ts'
import { stopSpeaking } from './tts.ts'

export interface SpeechRecognitionState {
  supported: boolean
  status: RecognizerStatus
  interim: string
  error: RecognizerError | null
  start: () => void
  stop: () => void
}

export function useSpeechRecognition(onFinal: (alternatives: string[]) => void): SpeechRecognitionState {
  const [status, setStatus] = useState<RecognizerStatus>('idle')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<RecognizerError | null>(null)
  const onFinalRef = useRef(onFinal)
  useEffect(() => {
    onFinalRef.current = onFinal
  }, [onFinal])
  const [recognizer] = useState(
    () =>
      new Recognizer({
        onStatus: setStatus,
        onInterim: setInterim,
        onFinal: (alternatives) => onFinalRef.current(alternatives),
        onError: setError,
      }),
  )
  useEffect(() => () => recognizer.abort(), [recognizer])
  const start = useCallback(() => {
    setError(null)
    setInterim('')
    stopSpeaking()
    recognizer.start()
  }, [recognizer])
  const stop = useCallback(() => recognizer.stop(), [recognizer])
  return { supported: recognizer.supported, status, interim, error, start, stop }
}
```

File: `src/speech/tts.ts`
```ts
export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

let voices: SpeechSynthesisVoice[] = []
/** Chrome stops firing onend if the utterance is garbage-collected mid-speech. */
let current: SpeechSynthesisUtterance | null = null

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported()) return Promise.resolve([])
  const now = speechSynthesis.getVoices()
  if (now.length) {
    voices = now
    return Promise.resolve(now)
  }
  return new Promise((resolve) => {
    const done = () => {
      voices = speechSynthesis.getVoices()
      resolve(voices)
    }
    speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, 1500)
  })
}

export function englishVoices(list: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return list.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('en'))
}

export function pickVoice(list: SpeechSynthesisVoice[], preferredURI: string | null): SpeechSynthesisVoice | undefined {
  const english = englishVoices(list)
  return (
    english.find((v) => v.voiceURI === preferredURI) ??
    english.find((v) => /en[-_]us/i.test(v.lang) && /google/i.test(v.name)) ??
    english.find((v) => /en[-_]us/i.test(v.lang)) ??
    english[0]
  )
}

export interface SpeakOptions {
  rate?: number
  voiceURI?: string | null
  onEnd?: () => void
}

export function speak(text: string, options: SpeakOptions = {}): void {
  if (!ttsSupported()) {
    options.onEnd?.()
    return
  }
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = options.rate ?? 1
  const voice = pickVoice(voices.length ? voices : speechSynthesis.getVoices(), options.voiceURI ?? null)
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  }
  utterance.onend = () => options.onEnd?.()
  utterance.onerror = () => options.onEnd?.()
  current = utterance
  // Chrome on Android sometimes drops an utterance queued right after cancel().
  setTimeout(() => {
    if (current === utterance) speechSynthesis.speak(utterance)
  }, 60)
}

export function stopSpeaking(): void {
  current = null
  if (ttsSupported()) speechSynthesis.cancel()
}

if (ttsSupported()) void loadVoices()
```

File: `src/speech/useSpeak.ts`
```ts
import { useCallback } from 'react'
import { useSettings } from '../store/settings.ts'
import { speak } from './tts.ts'

export type SpeakFn = (text: string, options?: { slow?: boolean; onEnd?: () => void }) => void

/** speak() with the user's rate and voice; slow plays at 70% of the chosen rate. */
export function useSpeak(): SpeakFn {
  const rate = useSettings((s) => s.ttsRate)
  const voiceURI = useSettings((s) => s.voiceURI)
  return useCallback<SpeakFn>(
    (text, options = {}) => speak(text, { rate: options.slow ? Math.max(0.5, rate * 0.7) : rate, voiceURI, onEnd: options.onEnd }),
    [rate, voiceURI],
  )
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/speech`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/speech
git commit -m "feat: add speech recognition controller and text-to-speech helpers"
```

---

### Task 11: 콘텐츠 로더, 검증 테스트, 자유 대화 주제

**Files:**
- Create: `src/content/index.ts`, `src/content/topics.json`, 빈 배열로 시작하는 `src/content/vocab-l1.json` ~ `vocab-l4.json`, `src/content/lessons-daily.json`, `lessons-travel.json`, `lessons-work.json`, `lessons-feelings.json`
- Test: `src/content/content.test.ts`

**Interfaces:**
- Consumes: 콘텐츠 타입 (Task 5)
- Produces: `WORDS: Word[]`, `WORD_BY_ID: Map<string, Word>`, `wordsOfLevel(level)`, `LEVEL_NAMES`, `LEVEL_DESCRIPTIONS`, `COURSES: Course[]`, `LESSONS: Lesson[]`, `LESSON_BY_ID`, `TOPICS: Topic[]`, `TOPIC_BY_ID`

- [ ] **Step 1: 검증 테스트 작성**

File: `src/content/content.test.ts`
```ts
import { describe, expect, it } from 'vitest'
import { COURSES, LESSONS, TOPICS, WORDS, wordsOfLevel } from './index.ts'
import type { Level } from './types.ts'

const POS = new Set(['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'determiner', 'interjection', 'phrase'])

function containsExactly(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^A-Za-z])${escaped}([^A-Za-z]|$)`, 'i').test(text)
}

const stripEnd = (s: string) => s.replace(/[.?!]+$/, '').trim().toLowerCase()

describe('vocabulary', () => {
  it.each([1, 2, 3, 4] as Level[])('level %i has 200 words', (level) => {
    expect(wordsOfLevel(level)).toHaveLength(200)
  })

  it('has unique headwords across all levels', () => {
    const seen = new Set<string>()
    const dups: string[] = []
    for (const w of WORDS) {
      if (seen.has(w.id)) dups.push(w.word)
      seen.add(w.id)
    }
    expect(dups).toEqual([])
  })

  it('has complete, short fields', () => {
    const bad = WORDS.filter(
      (w) =>
        !w.word.trim() ||
        !POS.has(w.pos) ||
        !w.meaning.trim() ||
        w.meaning.length > 24 ||
        !w.example.trim() ||
        !w.exampleKo.trim() ||
        /\d/.test(w.example),
    )
    expect(bad.map((w) => w.word)).toEqual([])
  })

  it('uses the exact headword in every example', () => {
    const bad = WORDS.filter((w) => !containsExactly(w.example, w.word))
    expect(bad.map((w) => `${w.word}: ${w.example}`)).toEqual([])
  })
})

describe('lessons', () => {
  it('has four courses with six lessons each', () => {
    expect(COURSES.map((c) => c.id)).toEqual(['daily', 'travel', 'work', 'feelings'])
    expect(COURSES.map((c) => c.lessons.length)).toEqual([6, 6, 6, 6])
  })

  it('has unique lesson ids', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length)
  })

  it('has six expressions and a six-to-eight line dialogue that the AI opens', () => {
    const bad = LESSONS.filter(
      (l) =>
        l.expressions.length !== 6 ||
        l.dialogue.lines.length < 6 ||
        l.dialogue.lines.length > 8 ||
        l.dialogue.lines[0].speaker !== 'ai' ||
        l.dialogue.lines.filter((x) => x.speaker === 'user').length < 3,
    )
    expect(bad.map((l) => l.id)).toEqual([])
  })

  it('uses at least two key expressions in the learner’s lines', () => {
    const bad = LESSONS.filter((l) => {
      const userText = l.dialogue.lines.filter((x) => x.speaker === 'user').map((x) => x.en.toLowerCase()).join(' | ')
      return l.expressions.filter((e) => userText.includes(stripEnd(e.en))).length < 2
    })
    expect(bad.map((l) => l.id)).toEqual([])
  })

  it('has every text field filled in', () => {
    const bad = LESSONS.filter(
      (l) =>
        !l.title ||
        !l.description ||
        l.expressions.some((e) => !e.en.trim() || !e.ko.trim()) ||
        l.dialogue.lines.some((x) => !x.en.trim() || !x.ko.trim()) ||
        !l.dialogue.setting ||
        !l.aiScenario.role ||
        !l.aiScenario.situation ||
        !l.aiScenario.opening ||
        !l.aiScenario.openingKo,
    )
    expect(bad.map((l) => l.id)).toEqual([])
  })
})

describe('topics', () => {
  it('has ten free-talk topics with openings', () => {
    expect(TOPICS).toHaveLength(10)
    expect(TOPICS.every((t) => t.id && t.title && t.topic && t.opening && t.openingKo)).toBe(true)
  })
})
```

- [ ] **Step 2: 로더와 주제 작성, 나머지 JSON은 `[]`로 생성**

File: `src/content/index.ts`
```ts
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
```

File: `src/content/topics.json`
```json
[
  { "id": "today", "title": "오늘 하루", "topic": "how the learner's day has been", "opening": "Hi there! How has your day been so far?", "openingKo": "안녕하세요! 오늘 하루 어떻게 보내고 있어요?" },
  { "id": "hobbies", "title": "취미", "topic": "hobbies and free time", "opening": "What do you like to do in your free time?", "openingKo": "시간 날 때 뭐 하는 걸 좋아해요?" },
  { "id": "travel", "title": "여행", "topic": "travel experiences and dream trips", "opening": "Have you been anywhere fun recently, or is there a place you really want to visit?", "openingKo": "최근에 재미있는 곳에 다녀왔어요? 아니면 꼭 가 보고 싶은 곳이 있어요?" },
  { "id": "food", "title": "음식", "topic": "food, cooking, and restaurants", "opening": "What's your favorite food? I'm always looking for something new to try.", "openingKo": "제일 좋아하는 음식이 뭐예요? 저는 늘 새로 먹어 볼 걸 찾고 있거든요." },
  { "id": "movies", "title": "영화와 드라마", "topic": "movies, TV shows, and dramas", "opening": "Have you watched any good movies or shows lately?", "openingKo": "요즘 재미있게 본 영화나 드라마 있어요?" },
  { "id": "work", "title": "일과 공부", "topic": "the learner's job or studies", "opening": "What do you do? Are you working or studying these days?", "openingKo": "무슨 일 하세요? 요즘 일하세요, 아니면 공부하세요?" },
  { "id": "weekend", "title": "주말 계획", "topic": "weekend plans", "opening": "Do you have any plans for this weekend?", "openingKo": "이번 주말에 무슨 계획 있어요?" },
  { "id": "goals", "title": "목표와 꿈", "topic": "personal goals and dreams", "opening": "What's one goal you're working on this year?", "openingKo": "올해 이루려고 노력 중인 목표 하나만 말해 줄래요?" },
  { "id": "hometown", "title": "고향", "topic": "the learner's hometown and where they live now", "opening": "Where are you from? What's your hometown like?", "openingKo": "어디 출신이에요? 고향은 어떤 곳이에요?" },
  { "id": "shopping", "title": "최근 산 물건", "topic": "something the learner bought recently", "opening": "What's the last thing you bought that made you really happy?", "openingKo": "최근에 사고 정말 기분 좋았던 물건이 뭐예요?" }
]
```

- [ ] **Step 3: 실패 확인 (콘텐츠 없음)**

Run: `npx vitest run src/content`
Expected: FAIL — 단어 수(0 ≠ 200), 코스별 레슨 수. 주제 테스트와 중복/필드 테스트는 PASS.

- [ ] **Step 4: Commit**

```bash
git add src/content
git commit -m "feat: add content loader, validation tests, and free-talk topics"
```

---

### Task 12~15: 단어 콘텐츠 (레벨별 200개)

Task 12 = `vocab-l1.json`(기초), Task 13 = `vocab-l2.json`(일상), Task 14 = `vocab-l3.json`(중급), Task 15 = `vocab-l4.json`(고급). 네 Task 모두 같은 절차를 따른다.

**Files:**
- Modify: `src/content/vocab-l{n}.json`

**Interfaces:**
- Consumes: `RawWord` 형식 (Task 5), 검증 테스트 (Task 11)

**작성 규칙** (검증 테스트가 강제하는 것 + 품질 규칙)
- 형식: `{ "word": "borrow", "pos": "verb", "meaning": "빌리다", "example": "Can I borrow your umbrella?", "exampleKo": "우산 좀 빌려도 될까요?" }`
- 레벨 기준
  - 기초(A2): 일상에서 바로 쓰는 필수 어휘. 너무 쉬운 단어(cat, go, is)는 빼고, 한국 성인이 말할 때 자주 막히는 기본 동사·형용사·명사(borrow, lend, decide, enough, expensive, weather, invite, forget…)
  - 일상(B1): 일상 회화와 여행·생활 어휘(appointment, available, recommend, convenient, refund, delay…)
  - 중급(B2): 수능·토익 핵심 어휘(accommodate, anticipate, adequate, allocate…)
  - 고급(C1): 비즈니스·고급 표현(ambiguous, meticulous, leverage, comprehensive…)
- 품사 비율: 동사 약 40%, 명사 약 30%, 형용사 약 20%, 부사와 구동사·숙어(`phrase`) 약 10%
- `meaning`: 한국어 뜻 1~3개를 ", "로 구분, 24자 이하
- `example`: 표제어를 **그대로** 포함(동사는 원형으로 쓰이는 문장: to부정사, 조동사, 명령문, 복수 주어 현재형 / 명사는 단수). 기초·일상은 14단어 이하, 중급·고급은 18단어 이하. 숫자는 쓰지 않는다(채점·발음 재생 오류 방지)
- `exampleKo`: 자연스러운 한국어 해석
- 네 레벨 전체에서 표제어 중복 금지
- 50개씩 나눠서 작성하고, 작성할 때마다 아래 검증을 돌린다

- [ ] **Step 1: 50개 작성 → 검증**

Run: `npx vitest run src/content -t "vocabulary"`
Expected: 해당 레벨 개수 테스트만 FAIL(아직 200개 미만), 중복·필드·예문 테스트는 PASS. 실패가 있으면 그 항목을 고친다.

- [ ] **Step 2: 100, 150, 200개까지 같은 방식으로 반복**

- [ ] **Step 3: 레벨 테스트 통과 확인**

Run: `npx vitest run src/content -t "level {n} has 200 words"`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/content/vocab-l{n}.json
git commit -m "content: add level {n} vocabulary (200 words)"
```

---

### Task 16~17: 말하기 레슨 콘텐츠

Task 16 = `lessons-daily.json`, `lessons-travel.json` (12개), Task 17 = `lessons-work.json`, `lessons-feelings.json` (12개).

**Files:**
- Modify: `src/content/lessons-*.json`

**Interfaces:**
- Consumes: `RawLesson` 형식 (Task 5), 검증 테스트 (Task 11)

**레슨 목록**

| id | 제목 | id | 제목 |
|---|---|---|---|
| daily-1 | 자기소개하기 | work-1 | 첫 인사와 스몰토크 |
| daily-2 | 안부와 근황 | work-2 | 회의에서 의견 말하기 |
| daily-3 | 취미 이야기 | work-3 | 일정 잡기 |
| daily-4 | 주말 계획 | work-4 | 전화와 화상회의 |
| daily-5 | 음식과 취향 | work-5 | 부탁하고 거절하기 |
| daily-6 | 길 묻고 답하기 | work-6 | 진행 상황 보고하기 |
| travel-1 | 공항과 기내 | feelings-1 | 감사와 사과 |
| travel-2 | 호텔 체크인 | feelings-2 | 축하와 위로 |
| travel-3 | 식당에서 주문하기 | feelings-3 | 동의와 반대 |
| travel-4 | 교통수단 이용하기 | feelings-4 | 추천과 조언 |
| travel-5 | 쇼핑과 환불 | feelings-5 | 불만 말하기 |
| travel-6 | 곤란한 상황 해결하기 | feelings-6 | 초대와 약속 |

**형식 예시 (travel-2, 표현과 대사 일부)**
```json
{
  "id": "travel-2",
  "title": "호텔 체크인",
  "description": "예약 확인부터 요청 사항까지",
  "expressions": [
    { "en": "I'd like to check in, please.", "ko": "체크인하려고요.", "tip": "I'd like to는 I want to보다 공손해요." },
    { "en": "I have a reservation under Kim.", "ko": "김이라는 이름으로 예약했어요." }
  ],
  "dialogue": {
    "setting": "호텔 프런트에서 체크인을 해요.",
    "aiRole": "프런트 직원",
    "userRole": "투숙객",
    "lines": [
      { "speaker": "ai", "en": "Good evening! Welcome to the Grand Hotel. How can I help you?", "ko": "안녕하세요! 그랜드 호텔에 오신 걸 환영합니다. 무엇을 도와드릴까요?" },
      { "speaker": "user", "en": "Hi, I'd like to check in, please.", "ko": "안녕하세요, 체크인하려고요." },
      { "speaker": "ai", "en": "Sure. Do you have a reservation?", "ko": "네. 예약하셨나요?" },
      { "speaker": "user", "en": "Yes, I have a reservation under Kim.", "ko": "네, 김이라는 이름으로 예약했어요." }
    ]
  },
  "aiScenario": {
    "role": "a friendly front desk clerk at a hotel",
    "situation": "The learner is checking in. Ask for the reservation name, confirm the stay, and handle one simple request such as a late checkout or extra towels.",
    "opening": "Good evening! Welcome to the Grand Hotel. Do you have a reservation with us?",
    "openingKo": "안녕하세요! 그랜드 호텔에 오신 걸 환영합니다. 예약하셨나요?"
  }
}
```

**작성 규칙**
- 표현 6개: 그 상황에서 바로 쓰는 완결된 문장, 10단어 안팎. `tip`은 쓸 만할 때만(한국어 한 문장).
- 대사 6~8줄, AI가 먼저 말하고 학습자 대사는 3줄 이상. 학습자 대사에 핵심 표현이 최소 2개 그대로 들어간다(문장 끝 부호 제외).
- 숫자는 단어로 쓴다(two nights, seven o'clock). 고유명사는 Kim, Grand Hotel 정도로 단순하게.
- `aiScenario.role`, `situation`, `opening`은 영어, `openingKo`는 한국어.

- [ ] **Step 1: 첫 코스 6개 작성 → 검증**

Run: `npx vitest run src/content -t "lessons"`
Expected: 코스 개수 테스트만 FAIL(다른 코스가 비어 있음), 형식·표현 사용·필드 테스트는 PASS.

- [ ] **Step 2: 두 번째 코스 6개 작성 → 검증 (Task 17이 끝나면 전체 PASS)**

Run: `npx vitest run src/content`
Expected: Task 17 이후 PASS

- [ ] **Step 3: Commit**

```bash
git add src/content/lessons-*.json
git commit -m "content: add speaking lessons for <courses>"
```

---

### Task 18: 앱 뼈대, 디자인 토큰, 공통 컴포넌트

시작할 때 `frontend-design` 스킬을 불러 디자인 방향(색, 버튼 질감, 애니메이션)을 정한다. 브레인스토밍 시안(흰 배경, 보라 포인트, 둥근 카드, 하단 시트, 큰 마이크)을 기준으로 한다.

**Files:**
- Modify: `src/index.css`, `src/main.tsx`, `src/App.tsx`
- Create: `src/components/Screen.tsx`, `Button.tsx`, `ProgressBar.tsx`, `SessionHeader.tsx`, `BackHeader.tsx`, `FeedbackSheet.tsx`, `MicButton.tsx`, `SpeakerButton.tsx`, `SpeakInput.tsx`, `ScoredSentence.tsx`, `TabBar.tsx`, `TabLayout.tsx`, `Toast.tsx`, `Celebrate.tsx`, `EmptyState.tsx`, `Choice.tsx`
- Create: `src/lib/format.ts` (+ `src/lib/format.test.ts`)

**Interfaces:**
- Consumes: 스토어(Task 9), 음성(Task 10), `completeOAuth` (Task 8), `ScoredToken` (Task 4)
- Produces (이후 화면 Task가 사용):
  - `<Screen tabs?>`: 화면 컨테이너(최대 폭 480px, 좌우 20px, 상단 안전 영역, `tabs`면 탭 바 높이만큼 아래 여백)
  - `<Button variant="primary|secondary|ghost|success|danger" size="lg|md|sm" block>`: 눌리는 느낌의 3D 하단 테두리 버튼
  - `<ProgressBar value={0..1} />`, `<SessionHeader progress label onClose />`, `<BackHeader title onBack? right? />`
  - `<FeedbackSheet tone="success|danger" title action onAction>{children}</FeedbackSheet>`: 화면 아래에서 올라오는 시트
  - `<MicButton listening disabled? size="lg|md" onClick />`
  - `<SpeakerButton text slow? label? autoPlay? />`
  - `<SpeakInput onResult={(alternatives: string[]) => void} disabled? placeholder? compact? />`: 마이크 + [직접 입력] 전환, 듣는 중 중간 결과 표시, 오류 안내, 음성인식 미지원이면 키보드 모드로 시작
  - `<ScoredSentence tokens />`, `<Choice label state="idle|selected|correct|wrong|disabled" onClick />`
  - `<Celebrate />`: 마운트 시 canvas-confetti 한 번
  - `<EmptyState icon title body action? />`
  - `<Toast />` + `useToast().show(message)`
  - `formatKoreanDate(day: string): string` (예: "10월 2일 금요일"), `greeting(hour: number): string`, `usdToKrw(usd: number): number` (1달러 = 1,400원, 반올림), `formatUsd(usd: number): string`

- [ ] **Step 1: 포맷 유틸 테스트 작성 → 실패 확인**

File: `src/lib/format.test.ts`
```ts
import { describe, expect, it } from 'vitest'
import { formatKoreanDate, formatUsd, greeting, usdToKrw } from './format.ts'

describe('format', () => {
  it('formats a day key in Korean', () => {
    expect(formatKoreanDate('2026-10-02')).toBe('10월 2일 금요일')
  })

  it('greets by time of day', () => {
    expect(greeting(8)).toBe('좋은 아침이에요')
    expect(greeting(14)).toBe('좋은 오후예요')
    expect(greeting(21)).toBe('좋은 저녁이에요')
    expect(greeting(2)).toBe('늦은 밤이에요')
  })

  it('converts and formats cost', () => {
    expect(usdToKrw(0.0123)).toBe(17)
    expect(formatUsd(0.0123)).toBe('$0.0123')
    expect(formatUsd(1.5)).toBe('$1.50')
  })
})
```

Run: `npx vitest run src/lib/format.test.ts` → FAIL

- [ ] **Step 2: 포맷 유틸 구현 → 통과 확인**

File: `src/lib/format.ts`
```ts
import { parseDayKey } from './date.ts'

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

export function formatKoreanDate(day: string): string {
  const d = parseDayKey(day)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}`
}

export function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return '좋은 아침이에요'
  if (hour >= 12 && hour < 18) return '좋은 오후예요'
  if (hour >= 18 && hour < 24) return '좋은 저녁이에요'
  return '늦은 밤이에요'
}

export const KRW_PER_USD = 1400

export function usdToKrw(usd: number): number {
  return Math.round(usd * KRW_PER_USD)
}

export function formatUsd(usd: number): string {
  return usd >= 1 ? `$${usd.toFixed(2)}` : `$${usd.toFixed(4)}`
}
```

Run: `npx vitest run src/lib/format.test.ts` → PASS

- [ ] **Step 3: 디자인 토큰과 공통 컴포넌트 작성**

`src/index.css`의 `@theme`에 브랜드 보라 램프(`--color-brand-50` ~ `--color-brand-900`), 정답 초록, 오답 빨강, 경고 노랑, 폰트를 정의한다. 버튼은 `border-b-4`(눌리면 `translate-y` + 테두리 축소)로 게임 같은 질감을 준다. 시트 등장(`slide-up`), 마이크 파동(`pulse-ring`), 정답 흔들림(`pop`) 키프레임을 정의한다.

`SpeakInput` 동작 명세
- 상태: `mode: 'voice' | 'keyboard'`(음성인식 미지원이면 'keyboard'로 시작), `useSpeechRecognition(onFinal)`
- 마이크를 누르면 `start()`, 듣는 중에 다시 누르면 `stop()`
- 듣는 중이면 중간 결과를 회색 글씨로 보여준다
- 결과 없이 듣기가 끝나면(listening → idle, 그 사이 onFinal 없음) "잘 안 들렸어요. 다시 말해 볼까요?"
- 오류 문구: `not-allowed` → "마이크 권한을 허용해 주세요. 직접 입력으로도 할 수 있어요." + 키보드 모드로 전환 / `unsupported` → "이 브라우저는 음성인식을 지원하지 않아요. 크롬에서 열어 주세요." + 키보드 모드 / `network` → "음성인식에 인터넷이 필요해요." / `no-speech` → "잘 안 들렸어요. 다시 말해 볼까요?"
- 키보드 모드: 한 줄 입력 + [확인]. 엔터로도 제출. 빈 값이면 제출하지 않는다. 제출하면 `onResult([text])`
- `disabled`면 마이크와 입력이 모두 비활성

`App.tsx` 라우트(HashRouter). 설치 후 `react-router`가 `createHashRouter`, `RouterProvider`, `Navigate`, `Outlet`, `NavLink`, `useNavigate`, `useParams`, `useSearchParams`, `useLocation`을 내보내는지 타입 정의로 확인한다.
```
/onboarding                    Onboarding
/ (TabLayout)                  Home
/vocab (TabLayout)             VocabHome
/vocab/words                   WordList
/vocab/words/:wordId           WordDetail
/vocab/session                 VocabSession   (?more=1)
/speaking (TabLayout)          SpeakingHome
/speaking/:lessonId            LessonPlayer
/tutor (TabLayout)             TutorHome
/tutor/connect                 TutorConnect
/tutor/chat/:conversationId    TutorChat
/tutor/summary/:conversationId TutorSummary
/me (TabLayout)                Me
/me/settings                   Settings
*                              → /
```
온보딩 가드: `useSettings((s) => s.onboarded)`가 false면 `/onboarding`이 아닌 모든 경로를 `/onboarding`으로 보낸다.

`main.tsx` 부팅 순서
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { completeOAuth } from './lib/ai/oauth.ts'
import { useToast } from './store/toast.ts'
import { useTutor } from './store/tutor.ts'

async function boot() {
  const result = await completeOAuth(window.location.search, window.localStorage)
  if (result.status !== 'none') {
    if (result.status === 'ok') {
      useTutor.getState().setApiKey(result.key)
      useToast.getState().show('OpenRouter에 연결됐어요')
    } else {
      useToast.getState().show(result.message)
    }
    const hash = result.status === 'ok' ? '#/tutor' : '#/tutor/connect'
    window.history.replaceState(null, '', window.location.pathname + hash)
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()
```

- [ ] **Step 4: 확인**

Run: `npm run build`
Expected: 성공

내장 브라우저를 375×812로 맞추고 `/#/`를 연다. 온보딩으로 이동하는지(아직 빈 화면이어도 됨), 콘솔 오류가 없는지 확인한다.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add app shell, routing, design tokens, and shared components"
```

---

### Task 19: 온보딩

**Files:**
- Create: `src/screens/onboarding/Onboarding.tsx`

**Interfaces:**
- Consumes: `useSettings`, `LEVEL_NAMES`, `LEVEL_DESCRIPTIONS`, `DAILY_GOALS`, `NEW_PER_DAY_OPTIONS`, `Button`, `Choice`

**명세**
- 단계 상태 `step: 0..3`, 상단에 점 4개 진행 표시와 뒤로가기(첫 단계 제외)
- 0 환영: 로고, "EnglishMaster", "매일 15분, 말하고 외우는 영어", [시작하기]
- 1 레벨: "지금 영어 실력은 어느 정도인가요?" — 레벨 4개 카드(이름 + 설명), 고르면 [다음] 활성
- 2 하루 목표: "하루 목표를 정해요" — 가볍게 30 XP(약 5분) / 보통 50 XP(약 10분) / 열심히 100 XP(약 20분)
- 3 새 단어: "하루에 새 단어 몇 개씩 배울까요?" — 5 / 10 / 15 / 20, 아래에 "나중에 설정에서 바꿀 수 있어요"
- [시작하기] → `update({ level, dailyGoal, newPerDay, onboarded: true })`, `navigator.storage?.persist?.()` 호출(실패 무시), `/`로 이동(`replace`)

- [ ] **Step 1: 구현**
- [ ] **Step 2: 확인** — 내장 브라우저에서 네 단계를 거쳐 홈으로 가는지, 새로고침해도 온보딩이 다시 나오지 않는지, localStorage `em:settings`에 값이 저장됐는지 본다.
- [ ] **Step 3: Commit** — `git commit -m "feat: add onboarding flow"`

---

### Task 20: 홈

**Files:**
- Create: `src/screens/home/Home.tsx`, `src/components/GoalRing.tsx`, `src/components/WeekDots.tsx`, `src/components/TodayWordsCard.tsx`
- Create: `src/lib/today.ts` (+ `src/lib/today.test.ts`)

**Interfaces:**
- Produces: `todayPlan(words, states, level, newByDay, newPerDay, today): { due: number; fresh: number; moreAvailable: boolean }` — 홈과 단어 탭이 함께 쓴다. `nextLesson(courses, lessons): { lesson: Lesson; course: Course; done: number } | null`

- [ ] **Step 1: 실패하는 테스트 작성**

File: `src/lib/today.test.ts`
```ts
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
```

- [ ] **Step 2: 구현 → 통과 확인**

File: `src/lib/today.ts`
```ts
import type { Course, Lesson, Level, Word } from '../content/types.ts'
import { newRemaining } from './progress.ts'
import { dueWords, newWordQueue } from './session.ts'
import type { WordState } from './srs.ts'

export function todayPlan(
  words: readonly Word[],
  states: Readonly<Record<string, WordState>>,
  level: Level,
  newByDay: Readonly<Record<string, number>>,
  newPerDay: number,
  today: string,
): { due: number; fresh: number; moreAvailable: boolean } {
  const unseen = newWordQueue(words, states, level).length
  return {
    due: dueWords(words, states, today).length,
    fresh: Math.min(newRemaining(newByDay, today, newPerDay), unseen),
    moreAvailable: unseen > 0,
  }
}

export function nextLesson(
  courses: readonly Course[],
  lessons: Readonly<Record<string, unknown>>,
): { lesson: Lesson; course: Course; done: number } | null {
  for (const course of courses) {
    const lesson = course.lessons.find((l) => !lessons[l.id])
    if (lesson) return { lesson, course, done: course.lessons.filter((l) => lessons[l.id]).length }
  }
  return null
}
```

Run: `npx vitest run src/lib/today.test.ts` → PASS

- [ ] **Step 3: 홈 화면 구현**

명세
- 머리말: `formatKoreanDate(dayKey())`(작은 회색), `greeting(new Date().getHours())`(큰 글씨), 오른쪽에 연속 학습일 칩(불꽃 + "N일", 0이면 회색)
- 목표 카드: `GoalRing`(오늘 XP / 하루 목표, 넘치면 꽉 참) + "오늘 목표" + "30 / 50 XP", 달성하면 "목표 달성!" 배지
- `TodayWordsCard`: 브랜드 색 카드. `todayPlan`으로 "복습 N개 · 새 단어 M개" + [학습 시작] → `/vocab/session`. 둘 다 0이면 "오늘 단어 완료!" + `moreAvailable`일 때만 [더 배우기] → `/vocab/session?more=1`
- 이어서 말하기 카드: `nextLesson` → "코스 · 레슨 제목", 진행 바(`done/6`), "N/6 레슨" → `/speaking/:id`. 다 끝났으면 "모든 레슨 완료! 다시 연습해 볼까요?" → `/speaking`
- AI 튜터 카드: 연결돼 있으면 "AI 튜터와 대화하기", 아니면 "AI 튜터 연결하기" → `/tutor`
- `WeekDots`: `weekCells` 월~일, 학습한 날은 채운 원, 오늘은 테두리 강조
- 탭 바 위로 스크롤되도록 `<Screen tabs>`

- [ ] **Step 4: 확인** — 내장 브라우저(375×812)에서 홈이 그려지고, 콘텐츠가 있으면 "새 단어 10개"가 나오는지 확인한다.
- [ ] **Step 5: Commit** — `git commit -m "feat: add home dashboard"`

---

### Task 21: 단어 탭 (요약, 목록, 상세)

**Files:**
- Create: `src/screens/vocab/VocabHome.tsx`, `src/screens/vocab/WordList.tsx`, `src/screens/vocab/WordDetail.tsx`

**명세**
- `VocabHome`: 제목 "단어", `TodayWordsCard`, 레벨 4줄(이름, 진행 바 `(learning + mastered) / 200`, "학습 중 N · 마스터 M", 현재 레벨에 "학습 레벨" 배지), [단어 목록 보기] → `/vocab/words`
- `WordList`: `BackHeader("단어 목록")`, 검색창(영어 단어 또는 한국어 뜻 부분 일치), 레벨 칩(전체/기초/일상/중급/고급), 상태 칩(전체/새 단어/학습 중/마스터), 결과 수 표시. 행: 단어(굵게), 품사 약어(n./v./adj./adv./phr. 등), 뜻, 상태 배지("새 단어" / "N단계" / "마스터"). 누르면 상세로. 검색 결과가 없으면 `EmptyState`
- `WordDetail`: 단어 + `SpeakerButton`(마운트 시 자동 재생), 품사·레벨, 뜻, 예문 + 발음 + 해석, 학습 상태("아직 안 배웠어요" / "복습 N단계 · 다음 복습 M월 D일" / "마스터한 단어예요"), 맞힘·틀림 횟수. 없는 id면 `EmptyState` + 목록으로

- [ ] **Step 1: 구현**
- [ ] **Step 2: 확인** — 목록 필터·검색, 상세 이동, 뒤로가기
- [ ] **Step 3: Commit** — `git commit -m "feat: add vocabulary overview, list, and detail screens"`

---

### Task 22: 단어 학습 세션

**Files:**
- Create: `src/screens/vocab/VocabSession.tsx`, `src/screens/vocab/QuizQuestion.tsx`, `src/screens/vocab/WordIntro.tsx`, `src/screens/vocab/SessionResult.tsx`

**Interfaces:**
- Consumes: `buildSession`, `clozeOf` (Task 5), `startRun`, `beginQuestion`, `answerRun`, `nextRun`, `runSummary` (Task 5), `saysWord` (Task 4), `useProgress().answerWord/markStudied`, `newRemaining`, `currentStreak`, `WORDS`, `WORD_BY_ID`

**명세**
- 마운트할 때 한 번만 세션을 만든다(`useState` 초기화 함수): `today = dayKey()`, `more = searchParams.get('more') === '1'`, `newLimit = more ? 10 : newRemaining(newByDay, today, newPerDay)`, `rng = Math.random`
- 문제가 0개면 `EmptyState`("오늘 학습할 단어가 없어요", "내일 복습할 단어가 기다리고 있어요") + [홈으로]
- 상단 `SessionHeader`: 진행률 `index / items.length`, "i/n", X → `confirm('학습을 그만둘까요? 지금까지 결과는 저장돼요.')`면 `/vocab`로
- `intro`: `WordIntro` — "새 단어" 배지, 단어(자동 발음), 품사, 뜻, 예문(발음 버튼) + 해석, [알겠어요] → `beginQuestion`
- `question`: `QuizQuestion` — 유형별
  - `meaning`: "알맞은 뜻을 고르세요", 단어 크게 + 발음(자동 재생), 보기 4개(한국어)
  - `listen`: "듣고 알맞은 뜻을 고르세요", 큰 스피커 버튼(자동 재생) + [다시 듣기] + [천천히], 보기 4개(한국어)
  - `reverse`: "알맞은 단어를 고르세요", 뜻 크게, 보기 4개(영어)
  - `cloze`: "빈칸에 알맞은 단어를 고르세요", `clozeOf(example, word)` + 해석, 보기 4개(영어)
  - `speak`: "영어로 말해 보세요", 뜻 크게 + 빈칸 예문 힌트, `SpeakInput` → `saysWord(alternatives, word.word)`
  - 모든 유형 아래에 [모르겠어요] = 오답
- 답을 고르면: 고른 보기와 정답을 색으로 표시, 첫 출제(`!isRetry`)면 `answerWord(id, correct, dayKey())`로 XP와 일정을 바로 저장, `answerRun`
- `feedback`: `FeedbackSheet` — 정답 "정답이에요!"(+2 XP, 재출제면 XP 표시 없음) / 오답 "아쉬워요"(정답 단어와 뜻, `speak`면 "들린 말: …"). 공통으로 예문 + 해석 + 발음, [계속] → `nextRun`
- `done`: 처음 들어갈 때 한 번 `markStudied(dayKey())`. `SessionResult` — `Celebrate`, "학습 완료!", 정답률, 이번 세션 XP(첫 출제 정답 × 2), 연속 학습일, 틀린 단어 목록(단어 + 뜻 + 발음), [홈으로], [한 번 더](남은 복습이나 새 단어가 있을 때만 → 새 세션으로 다시 마운트)

- [ ] **Step 1: 구현**
- [ ] **Step 2: 확인** — 내장 브라우저에서 새 단어 소개 → 정답/오답 → 오답 재출제 → 결과 화면, `speak` 문제는 [직접 입력]으로 답한다. 결과 후 홈의 XP·연속 학습일이 올라갔는지 확인한다.
- [ ] **Step 3: Commit** — `git commit -m "feat: add vocabulary quiz session with feedback and results"`

---

### Task 23: 말하기 탭과 레슨 플레이어

**Files:**
- Create: `src/screens/speaking/SpeakingHome.tsx`, `src/screens/speaking/LessonPlayer.tsx`, `src/screens/speaking/steps/LearnStep.tsx`, `RepeatStep.tsx`, `RecallStep.tsx`, `RoleplayStep.tsx`, `LessonDone.tsx`
- Create: `src/lib/lessonScore.ts` (+ `src/lib/lessonScore.test.ts`)

**Interfaces:**
- Produces: `lessonScore(best: Record<string, number>, itemKeys: string[]): number` — 항목별 최고 점수 평균(시도 안 한 항목은 0)

- [ ] **Step 1: 실패하는 테스트 → 구현 → 통과**

File: `src/lib/lessonScore.test.ts`
```ts
import { describe, expect, it } from 'vitest'
import { lessonScore } from './lessonScore.ts'

describe('lessonScore', () => {
  it('averages best scores and counts skipped items as zero', () => {
    expect(lessonScore({ 'repeat-0': 100, 'recall-0': 80 }, ['repeat-0', 'recall-0', 'roleplay-1'])).toBe(60)
  })

  it('is zero for no items', () => {
    expect(lessonScore({}, [])).toBe(0)
  })
})
```

File: `src/lib/lessonScore.ts`
```ts
export function lessonScore(best: Readonly<Record<string, number>>, itemKeys: readonly string[]): number {
  if (itemKeys.length === 0) return 0
  return Math.round(itemKeys.reduce((sum, key) => sum + (best[key] ?? 0), 0) / itemKeys.length)
}
```

Run: `npx vitest run src/lib/lessonScore.test.ts` → PASS

- [ ] **Step 2: 화면 구현**

`SpeakingHome`: 제목 "말하기", 코스별 섹션(제목, 설명, "N/6 완료"), 레슨 카드(번호, 제목, 설명, 완료면 체크 + 최고 점수) → `/speaking/:id`

`LessonPlayer` 명세
- 단계: `learn → repeat → recall → roleplay → done`, 상단 4칸 분할 진행 바 + 단계 이름, X → 확인 후 `/speaking`
- 점수 기록: `best[key] = max(...)`, 키는 `repeat-i`, `recall-i`, `roleplay-j`(j는 학습자 대사의 줄 번호). 처음 통과한 항목마다 `addXp(XP.sentencePass, dayKey())`하고 통과한 키를 기억해 중복 지급하지 않는다
- `learn`: 표현 i/6 카드 — 영어(크게), 한국어, 팁 상자, 마운트 시 자동 발음, [듣기] [천천히], [다음]
- `repeat`: 영어 + 한국어 + [듣기][천천히] + `SpeakInput` → `scoreSpeech(en, alternatives)` → `ScoredSentence` + 점수 배지 + 문구(80 이상 "훌륭해요!" / 60 이상 "좋아요! 한 번 더 해볼까요?" / 그 아래 "다시 듣고 따라 해 보세요") + [다시 하기][다음]. [건너뛰기]도 둔다
- `recall`: "영어로 말해 보세요" + 한국어 크게 + `SpeakInput` → 점수 + 모범 답안(`ScoredSentence`) + "내가 말한 문장: …", 70 이상 통과. [정답 보기]는 점수 없이 답만 보여준다
- `roleplay`: 상황 설명(`dialogue.setting`, 역할), 대화 말풍선을 순서대로 쌓는다. AI 줄은 자동 발음 + 영어(한국어 보기 토글)이고 [다음 대사]로 넘어간다. 학습자 줄은 한국어 힌트 + [영어 보기] 토글 + `SpeakInput` → 점수(60 이상 통과) → 내 말풍선에 `ScoredSentence`. [다시 하기][다음]
- `done`: 처음 들어갈 때 한 번 `completeLesson(id, score, dayKey())`(score = `lessonScore`). `Celebrate`, 점수, 얻은 XP(통과 문장 × 5 + 20), [AI와 이 상황 연습하기](키가 있으면 롤플레이 대화를 만들고 채팅으로, 없으면 "AI 튜터 연결하기" → `/tutor/connect`), [레슨 목록으로]

AI 롤플레이 대화 만들기는 Task 24의 `startConversation`을 쓴다.

- [ ] **Step 3: 확인** — 레슨 하나를 [직접 입력]으로 끝까지 진행하고, 말하기 탭에 완료 체크와 점수가 뜨는지 확인한다.
- [ ] **Step 4: Commit** — `git commit -m "feat: add speaking courses and the four-step lesson player"`

---

### Task 24: AI 튜터 연결과 튜터 홈

**Files:**
- Create: `src/screens/tutor/TutorHome.tsx`, `src/screens/tutor/TutorConnect.tsx`, `src/screens/tutor/startConversation.ts`

**Interfaces:**
- Produces: `startConversation(kind: 'free' | 'roleplay', refId: string): string | null` — 주제/레슨을 찾아 대화를 만들고(`useTutor.getState().start`) id를 반환, 없으면 null. AI 첫 대사(opening + openingKo)를 첫 메시지로 넣는다. `appUrl(): string` — `window.location.origin + window.location.pathname` (OAuth 콜백과 HTTP-Referer에 사용)

**명세**
- `TutorHome`(키 없음): 아이콘, "AI 튜터와 영어로 대화해요", 장점 3줄(상황 롤플레이, 자유 대화, 말할 때마다 교정), [OpenRouter 연결하기] → `/tutor/connect`
- `TutorHome`(키 있음): 제목 "AI 튜터", 작은 글씨로 현재 모델(`modelLabel`) + 설정 링크. "자유 대화" 주제 10개(2열 카드), "상황 롤플레이" 코스별 레슨 24개(접이식 목록), "지난 대화"(제목, 날짜, 주고받은 횟수, 끝난 대화는 "요약 보기"). 진행 중인 대화는 채팅으로, 끝난 대화는 요약으로
- `TutorConnect`: `BackHeader("OpenRouter 연결")`, 설명("OpenRouter 계정으로 연결하면 이 폰에만 키가 저장돼요. 대화 내용은 OpenRouter와 선택한 AI 모델 회사로 전송돼요."), [OpenRouter로 연결] → `location.assign(await beginOAuth(localStorage, appUrl()))`. 구분선 아래 "키 직접 입력": `type="password"` 입력(`sk-or-` 형식 안내) + [저장](빈 값 무시) → `setApiKey(trim)`, 토스트 "연결됐어요", `/tutor`로. 팁: "OpenRouter의 Keys 메뉴에서 이 키에 월 사용 한도를 걸어두면 안심이에요."

- [ ] **Step 1: 구현**
- [ ] **Step 2: 확인** — 키 없이 튜터 탭, 연결 화면, 가짜 키(`sk-or-test`) 저장 후 튜터 홈 목록이 보이는지 확인한다. [OpenRouter로 연결]을 누르면 `openrouter.ai/auth?callback_url=...&code_challenge=...`로 가는지 주소만 확인한다(로그인하지 않는다).
- [ ] **Step 3: Commit** — `git commit -m "feat: add AI tutor home and OpenRouter connection"`

---

### Task 25: AI 대화와 요약

**Files:**
- Create: `src/screens/tutor/TutorChat.tsx`, `src/screens/tutor/TutorSummary.tsx`, `src/screens/tutor/contextFor.ts`

**Interfaces:**
- Consumes: `requestTutorTurn`, `requestSummary`, `toCorrection`, `AiError`, `AI_ERROR_MESSAGES`, `useTutor`, `useProgress().addXp/markStudied`, `XP.tutorTurn`, `TOPIC_BY_ID`, `LESSON_BY_ID`, `useSpeak`, `SpeakInput`
- Produces: `contextFor(conversation): TutorContext` — 자유 대화면 `{ kind: 'free', topic: topic.topic }`, 롤플레이면 `{ kind: 'roleplay', role, situation }`(찾지 못하면 자유 대화 'everyday life')

**`TutorChat` 명세**
- 대화가 없으면 `/tutor`로. 끝난 대화면 읽기 전용(입력창 대신 [요약 보기])
- 머리말: 뒤로(→ `/tutor`), 제목, 부제(자유 대화 / AI 롤플레이), [끝내기]
- 메시지: AI 말풍선(왼쪽, 회색) + [다시 듣기] + [번역 보기/숨기기]. 내 말풍선(오른쪽, 보라). 그 아래 교정 카드(노랑): "더 자연스럽게" + 고친 문장 + 발음 버튼 + 설명. 답을 기다리는 동안은 점 세 개 애니메이션
- 하단: [힌트](마지막 AI 메시지의 hints를 칩으로 펼침, 칩을 누르면 발음) + `SpeakInput compact` + 키보드 전환
- `send(text)`
  1. 보내는 중이면 무시. 내 메시지 추가(`correction` 없음)
  2. `requestTutorTurn({ apiKey, model, appUrl: appUrl(), level, context: contextFor(c), history })`
  3. 성공: `setCorrection(userMsgId, toCorrection(text, turn.correction))`, AI 메시지 추가(reply, replyKo, hints), `addCost`, `addXp(XP.tutorTurn, dayKey())`, `autoPlay`면 reply 발음
  4. 실패: `AI_ERROR_MESSAGES[kind]` 배너 + [다시 보내기](같은 기록으로 2번부터 재시도). `auth`면 [다시 연결] → `/tutor/connect`
- 새 메시지가 오면 맨 아래로 스크롤
- [끝내기]: 내 메시지가 없으면 대화를 지우고 `/tutor`로. 있으면 `/tutor/summary/:id`로(`replace`)

**`TutorSummary` 명세**
- 들어왔을 때 요약이 없고 끝나지 않은 대화면 `requestSummary` → 성공: `finish(id, now, summary)`, `addCost`, `markStudied(dayKey())`. 실패: 오류 문구 + [다시 시도] + [요약 없이 끝내기](`finish(id, now)`, `markStudied`)
- 로딩: "대화를 정리하고 있어요…"
- 표시: `Celebrate`(요약을 막 받은 경우), "대화 완료!", 주고받은 횟수, 얻은 XP(내 메시지 수 × 3), 비용 `formatUsd(cost)` + "약 N원"
- 섹션: 잘한 점 / 고칠 점(원래 문장 → 고친 문장 + 설명 + 발음) / 써먹을 표현(영어 + 한국어 + 발음)
- [대화 다시 보기] → `/tutor/chat/:id`, [AI 튜터 홈으로]

- [ ] **Step 1: 구현**
- [ ] **Step 2: 확인** — 실제 키가 없으므로 내장 브라우저에서는 가짜 키로 보내 `auth` 오류 배너와 [다시 연결]이 나오는지 확인한다. 응답이 정상일 때의 화면은 개발 중에만 `fetch`를 가로채는 대신, `TutorChat`이 받는 데이터가 `useTutor`에 들어가는 구조이므로 콘솔에서 `useTutor.getState().addMessage(...)`로 교정 카드가 있는 메시지를 넣어 렌더링을 확인한다.
- [ ] **Step 3: Commit** — `git commit -m "feat: add AI tutor chat with corrections and conversation summary"`

---

### Task 26: 나 탭과 설정

**Files:**
- Create: `src/screens/me/Me.tsx`, `src/screens/me/Settings.tsx`, `src/components/StudyCalendar.tsx`

**명세**
- `Me`: 제목 "나", 통계 카드 2열(연속 학습, 최장 연속, 총 XP, 오늘 XP, 마스터한 단어, 학습 중인 단어, 완료한 레슨 N/24), `StudyCalendar`(12주 × 7일, 열이 주, 행이 월~일, 학습한 날은 보라, 오늘은 테두리, 미래는 비움, 위에 월 표시), [설정] → `/me/settings`
- `Settings`(`BackHeader("설정")`)
  - 학습: 레벨(4칸 분할 버튼), 하루 목표(30/50/100), 하루 새 단어(5/10/15/20)
  - 발음: 속도 슬라이더(0.7~1.2, 0.1 단위) + [미리 듣기]("Hello! Nice to meet you."), 목소리 선택(`loadVoices` → `englishVoices`, 첫 항목 "자동 선택"), AI 답변 자동 재생 토글
  - AI 튜터: 연결 상태 + [연결하기]/[연결 해제](확인 후 `setApiKey(null)`), 모델 선택(`MODEL_OPTIONS`: 이름, 회사, "입력 $x · 출력 $y /100만 토큰") + "직접 입력"(OpenRouter 모델 ID, 저장 버튼)
  - 데이터: [백업 내보내기](`exportBackup` → Blob → `backupFileName(dayKey())` 다운로드), [백업 가져오기](파일 선택 → `parseBackup` → 실패 문구 토스트 / 성공 시 확인 후 `importBackup` + 토스트 "백업을 불러왔어요"), [모든 기록 초기화](확인 → 진도 초기화, 대화 기록 삭제, 설정 초기화 → `/onboarding`). API 키는 초기화해도 유지하고, 그 사실을 확인 문구에 적는다
  - 앱 정보: "EnglishMaster v0.1.0 · 개인 학습용 앱"

- [ ] **Step 1: 구현**
- [ ] **Step 2: 확인** — 설정 변경이 저장되는지, 백업 내보내기 파일이 내려받아지는지, 그 파일을 다시 가져오면 진도가 복원되는지 확인한다.
- [ ] **Step 3: Commit** — `git commit -m "feat: add stats, study calendar, and settings with backup"`

---

### Task 27: PWA (설치, 오프라인, 아이콘)

**Files:**
- Modify: `vite.config.ts`, `index.html`
- Create: `public/pwa-*.png`, `public/maskable-icon-512x512.png`, `public/apple-touch-icon-180x180.png`, `public/favicon.ico` (생성)

- [ ] **Step 1: 아이콘 생성**

```bash
npm install -D @vite-pwa/assets-generator@^1
npx pwa-assets-generator --preset minimal-2023 public/logo.svg
```
Expected: `public/`에 PNG 아이콘과 favicon 생성

- [ ] **Step 2: 플러그인 설정**

`vite.config.ts`의 `plugins`에 추가:
```ts
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['logo.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
  manifest: {
    name: 'EnglishMaster',
    short_name: 'EnglishMaster',
    description: '말하기 레슨, 단어 복습, AI 튜터로 매일 영어 공부',
    lang: 'ko',
    start_url: '/englishmaster/',
    scope: '/englishmaster/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'cdn',
          expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
})
```
`index.html`에 `<link rel="apple-touch-icon" href="/englishmaster/apple-touch-icon-180x180.png" />`를 추가한다. OpenRouter 요청은 캐시하지 않는다(런타임 캐시 규칙에 넣지 않는다).

- [ ] **Step 3: 확인**

Run: `npm run build && npx vite preview --port 4173`
Expected: `dist/manifest.webmanifest`, `dist/sw.js` 생성. 내장 브라우저에서 `http://localhost:4173/englishmaster/`를 열고 `navigator.serviceWorker.getRegistration()`이 등록돼 있는지, 매니페스트가 읽히는지 확인한다.

- [ ] **Step 4: Commit** — `git commit -m "feat: make the app an installable offline-capable PWA"`

---

### Task 28: 모델 비교 스크립트

**Files:**
- Create: `scripts/bench-models.ts`

**Interfaces:**
- Consumes: `MODEL_OPTIONS` (Task 8), `requestTutorTurn`, `toCorrection` (Task 8)

**명세**
- 키: 환경 변수 `OPENROUTER_API_KEY`, 없으면 `.env.local`의 `OPENROUTER_API_KEY=` 줄. 둘 다 없으면 안내 문구를 출력하고 종료 코드 1
- 대상 모델: 인자로 받은 ID들, 없으면 `MODEL_OPTIONS` 전체
- 테스트 문장(자유 대화 "weekend plans", AI 첫 대사 "Hi! Do you have any plans for this weekend?" 다음에 학습자가 말한 것으로 보낸다, 레벨 2)

| 학습자 발화 | 기대 | 고친 문장에 들어가야 할 말(하나라도) |
|---|---|---|
| I go to the park yesterday with my friend. | 교정 | went |
| She don't like spicy food. | 교정 | doesn't, does not |
| I am interesting in watching movies. | 교정 | interested |
| How about go hiking this Saturday? | 교정 | going |
| I want ice latte. | 교정 | iced |
| Can you explain me the rules? | 교정 | to me, explain the rules |
| I have been to Japan last year. | 교정 | went, was in, visited |
| I'm going to visit my grandmother this weekend. | 유지 | |
| I'm looking forward to the weekend. | 유지 | |
| Could you recommend a good restaurant near here? | 유지 | |
| My hobby is taking pictures of the night sky. | 유지 | |
| 주말에는 보통 집에서 쉬어요. | 교정 | relax, rest, stay home, stay at home |

- 실행: 모델끼리는 병렬, 한 모델 안에서는 순서대로 각 문장 1회
- 판정: 교정 문장은 `toCorrection`이 null이 아니고 고친 문장에 기대 표현이 들어 있으면 정답 / 유지 문장은 `toCorrection`이 null이면 정답
- 출력 표: 모델, 형식 성공률, 교정 정확도(12개 중), 지연 중앙값, p90, 턴당 평균 비용, 10분 대화 추정 비용(턴당 비용 × 15턴 × 1.6), 오류 종류
- `bench-results/YYYY-MM-DD.md`에 표와 모든 원문 응답(reply, correction, hints)을 저장(`.gitignore`에 포함됨)

- [ ] **Step 1: 구현**
- [ ] **Step 2: 확인** — 키 없이 `npm run bench`를 실행하면 안내 문구와 함께 종료 코드 1로 끝나는지 확인한다. `npx tsc -p tsconfig.node.json`으로 타입 확인.
- [ ] **Step 3: Commit** — `git commit -m "feat: add OpenRouter model benchmark script"`

키를 받으면: `npm run bench` → 결과 표를 사용자에게 보여주고 `DEFAULT_MODEL`과 모델별 `reasoning` 값을 결과에 맞게 고친다.

---

### Task 29: GitHub Pages 배포

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

- [ ] **Step 1: 워크플로 작성**

먼저 최신 메이저 버전을 확인한다: `gh api repos/actions/checkout/releases/latest --jq .tag_name` (setup-node, upload-pages-artifact, deploy-pages도 같은 방식). 아래 `@v4`/`@v3`를 확인한 최신 메이저로 바꾼다.

File: `.github/workflows/deploy.yml`
```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

`README.md`: 앱 소개, 폰에서 설치하는 법(크롬 → 홈 화면에 추가 → 마이크 허용 → 설정에서 OpenRouter 연결), 개발 명령, 모델 비교 실행법.

- [ ] **Step 2: 저장소 생성과 Pages 활성화**

```bash
gh repo create englishmaster --private --source=. --remote=origin --push
gh api -X POST repos/BusanTree/englishmaster/pages -f build_type=workflow
```
Pages 활성화가 요금제 때문에 거절되면(422):
```bash
gh repo edit BusanTree/englishmaster --visibility public --accept-visibility-change-consequences
gh api -X POST repos/BusanTree/englishmaster/pages -f build_type=workflow
gh workflow run Deploy
```

- [ ] **Step 3: 배포 확인**

Run: `gh run watch` (가장 최근 Deploy 실행)
Expected: build, deploy 모두 성공

Run: `curl -s -o /dev/null -w "%{http_code}" https://busantree.github.io/englishmaster/`
Expected: `200`. 내장 브라우저로 열어 온보딩이 뜨고 매니페스트와 서비스 워커가 등록되는지 확인한다.

- [ ] **Step 4: Commit** (워크플로와 README는 Step 2 push 전에 커밋돼 있어야 한다)

---

### Task 30: 최종 점검

- [ ] **Step 1: 자동 검사**

Run: `npm test && npm run lint && npm run build`
Expected: 모두 성공

- [ ] **Step 2: 화면 전체 흐름 (내장 브라우저 375×812, 배포 주소)**

온보딩 → 홈 → 단어 세션(정답, 오답, 재출제, 말하기 문제는 직접 입력) → 결과 → 홈 XP·연속 학습일 → 단어 목록·상세 → 레슨 하나 끝까지 → 튜터 연결 화면 → 가짜 키로 대화 시도(오류 배너) → 나 탭 통계·달력 → 설정 변경, 백업 내보내기/가져오기. 각 화면에서 콘솔 오류, 가로 스크롤, 잘린 글자가 없는지 본다.

- [ ] **Step 3: Review Focus 확인** — 위 Review Focus 5개 항목을 하나씩 직접 재현해 본다.

- [ ] **Step 4: 사용자에게 보고** — 배포 주소, 폰 설치 방법, 아직 사용자가 해야 할 일(OpenRouter 연결, 모델 비교용 키 제공), 알려진 한계.
