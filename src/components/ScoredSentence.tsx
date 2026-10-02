import type { ScoredToken } from '../lib/scoring.ts'

/** The target sentence with heard words in green and missed words underlined in red. */
export function ScoredSentence({ tokens, className = '' }: { tokens: ScoredToken[]; className?: string }) {
  return (
    <p className={`font-en text-[26px] font-extrabold leading-snug ${className}`}>
      {tokens.map((t, i) => (
        <span key={i} className={t.matched ? 'text-good' : 'text-bad underline decoration-[3px] underline-offset-4'}>
          {t.text}
          {i < tokens.length - 1 ? ' ' : ''}
        </span>
      ))}
    </p>
  )
}
