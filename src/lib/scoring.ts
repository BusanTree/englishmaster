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
