import { Turtle, Volume2 } from 'lucide-react'
import { useEffect } from 'react'
import { useSpeak } from '../speech/useSpeak.ts'

/** Plays `text` with the user's voice settings; `slow` plays at 70% speed. */
export function SpeakerButton({
  text,
  slow = false,
  label,
  autoPlay = false,
  className = '',
}: {
  text: string
  slow?: boolean
  label?: string
  autoPlay?: boolean
  className?: string
}) {
  const say = useSpeak()
  useEffect(() => {
    if (autoPlay) say(text)
  }, [autoPlay, text, say])
  const Icon = slow ? Turtle : Volume2
  return (
    <button
      type="button"
      onClick={() => say(text, { slow })}
      aria-label={label ?? (slow ? '천천히 듣기' : '발음 듣기')}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 border-line bg-white px-3 text-sm font-bold text-brand active:bg-brand-soft ${className}`}
    >
      <Icon size={18} strokeWidth={2.4} aria-hidden />
      {label}
    </button>
  )
}
