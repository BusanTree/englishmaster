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
