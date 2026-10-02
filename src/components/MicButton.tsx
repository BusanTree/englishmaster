import { Mic, Square } from 'lucide-react'

/** Big round mic; while listening it pulses and turns into a stop button. */
export function MicButton({
  listening,
  disabled = false,
  size = 'lg',
  onClick,
}: {
  listening: boolean
  disabled?: boolean
  size?: 'lg' | 'md'
  onClick: () => void
}) {
  const lg = size === 'lg'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={listening ? '그만 듣기' : '말하기'}
      aria-pressed={listening}
      className={`relative grid shrink-0 place-items-center rounded-full bg-brand text-white transition-transform duration-75 disabled:opacity-40 ${
        lg ? 'size-[88px] border-b-[6px]' : 'size-16 border-b-[5px]'
      } border-brand-deep active:translate-y-[2px] active:border-b-[3px]`}
    >
      {listening && (
        <>
          <span aria-hidden className="absolute inset-0 rounded-full bg-brand animate-pulse-ring" />
          <span aria-hidden className="absolute inset-0 rounded-full bg-brand animate-pulse-ring [animation-delay:0.7s]" />
        </>
      )}
      <span className="relative">
        {listening ? (
          <Square size={lg ? 28 : 22} fill="currentColor" strokeWidth={0} />
        ) : (
          <Mic size={lg ? 40 : 30} strokeWidth={2.4} />
        )}
      </span>
    </button>
  )
}
