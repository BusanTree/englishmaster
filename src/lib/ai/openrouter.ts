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
