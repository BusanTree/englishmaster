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
