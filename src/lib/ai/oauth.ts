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
