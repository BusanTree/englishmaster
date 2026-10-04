// Compares OpenRouter models on the tutor's real prompt: speed, cost, JSON reliability, and correction accuracy.
// Usage: npm run bench [-- model-id ...]   (needs OPENROUTER_API_KEY in the environment or .env.local)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { MODEL_OPTIONS } from '../src/lib/ai/models.ts'
import { AiError } from '../src/lib/ai/openrouter.ts'
import { toCorrection, type TutorTurn } from '../src/lib/ai/prompts.ts'
import { requestTutorTurn } from '../src/lib/ai/tutor.ts'

interface Case {
  say: string
  expect: 'fix' | 'keep'
  /** For fixes: the corrected sentence must contain at least one of these (case-insensitive). */
  anyOf?: string[]
}

const CASES: Case[] = [
  { say: 'I go to the park yesterday with my friend.', expect: 'fix', anyOf: ['went'] },
  { say: "She don't like spicy food.", expect: 'fix', anyOf: ["doesn't", 'does not'] },
  { say: 'I am interesting in watching movies.', expect: 'fix', anyOf: ['interested'] },
  { say: 'How about go hiking this Saturday?', expect: 'fix', anyOf: ['going'] },
  { say: 'I want ice latte.', expect: 'fix', anyOf: ['iced'] },
  { say: 'Can you explain me the rules?', expect: 'fix', anyOf: ['to me', 'explain the rules'] },
  { say: 'I have been to Japan last year.', expect: 'fix', anyOf: ['went', 'was in', 'visited'] },
  { say: "I'm going to visit my grandmother this weekend.", expect: 'keep' },
  { say: "I'm looking forward to the weekend.", expect: 'keep' },
  { say: 'Could you recommend a good restaurant near here?', expect: 'keep' },
  { say: 'My hobby is taking pictures of the night sky.', expect: 'keep' },
  { say: '주말에는 보통 집에서 쉬어요.', expect: 'fix', anyOf: ['relax', 'rest', 'stay home', 'stay at home'] },
]

const OPENING = 'Hi! Do you have any plans for this weekend?'

function loadKey(): string | null {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY.trim()
  if (!existsSync('.env.local')) return null
  const line = readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('OPENROUTER_API_KEY='))
  return line ? line.slice('OPENROUTER_API_KEY='.length).trim() : null
}

interface Row {
  say: string
  ok: boolean
  hit: boolean
  latencyMs: number
  cost: number
  error?: string
  turn?: TutorTurn
}

function judge(c: Case, turn: TutorTurn): boolean {
  const correction = toCorrection(c.say, turn.correction)
  if (c.expect === 'keep') return correction === null
  if (!correction) return false
  const fixed = correction.corrected.toLowerCase()
  return (c.anyOf ?? []).some((w) => fixed.includes(w.toLowerCase()))
}

async function runModel(apiKey: string, model: string): Promise<Row[]> {
  const rows: Row[] = []
  for (const c of CASES) {
    const started = Date.now()
    try {
      const res = await requestTutorTurn({
        apiKey,
        model,
        level: 2,
        context: { kind: 'free', topic: 'weekend plans' },
        history: [
          { role: 'ai', text: OPENING },
          { role: 'user', text: c.say },
        ],
      })
      rows.push({ say: c.say, ok: true, hit: judge(c, res.data), latencyMs: res.latencyMs, cost: res.cost, turn: res.data })
    } catch (err) {
      const message = err instanceof AiError ? `${err.kind}: ${err.message}` : String(err)
      rows.push({ say: c.say, ok: false, hit: false, latencyMs: Date.now() - started, cost: 0, error: message })
    }
  }
  return rows
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]
}

async function main() {
  const apiKey = loadKey()
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY가 없어요. 환경 변수나 .env.local(OPENROUTER_API_KEY=...)에 넣고 다시 실행해 주세요.')
    process.exit(1)
  }
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : MODEL_OPTIONS.map((m) => m.id)
  console.log(`모델 ${ids.length}개 × 문장 ${CASES.length}개 비교 중…`)
  const results = await Promise.all(ids.map(async (id) => [id, await runModel(apiKey, id)] as const))

  const header = '| 모델 | 형식 성공 | 교정 정확도 | 지연 중앙값 | 지연 p90 | 턴당 비용 | 10분 대화 추정 | 오류 |'
  const lines = [header, '|---|---|---|---|---|---|---|---|']
  for (const [id, rows] of results) {
    const ok = rows.filter((r) => r.ok)
    const lat = ok.map((r) => r.latencyMs)
    const avgCost = ok.length ? ok.reduce((s, r) => s + r.cost, 0) / ok.length : 0
    const errors = [...new Set(rows.filter((r) => r.error).map((r) => r.error!.split(':')[0]))].join(', ') || '-'
    lines.push(
      `| ${id} | ${ok.length}/${rows.length} | ${rows.filter((r) => r.hit).length}/${rows.length} | ${(percentile(lat, 50) / 1000).toFixed(2)}s | ${(percentile(lat, 90) / 1000).toFixed(2)}s | $${avgCost.toFixed(5)} | $${(avgCost * 15 * 1.6).toFixed(4)} | ${errors} |`,
    )
  }
  const table = lines.join('\n')
  console.log(`\n${table}\n`)

  const day = new Date().toLocaleDateString('sv-SE')
  const detail = results
    .map(([id, rows]) =>
      [
        `## ${id}`,
        ...rows.map((r) =>
          r.ok
            ? `- ${r.hit ? 'O' : 'X'} "${r.say}" → reply: ${r.turn!.reply} | correction: ${JSON.stringify(r.turn!.correction)} | hints: ${JSON.stringify(r.turn!.hints)} | ${r.latencyMs}ms`
            : `- ! "${r.say}" → ${r.error}`,
        ),
      ].join('\n'),
    )
    .join('\n\n')
  mkdirSync('bench-results', { recursive: true })
  writeFileSync(`bench-results/${day}.md`, `# 모델 비교 ${day}\n\n${table}\n\n${detail}\n`)
  console.log(`원문 응답: bench-results/${day}.md`)
}

void main()
