export type ChoiceState = 'idle' | 'correct' | 'wrong' | 'dim'

const STATES: Record<ChoiceState, string> = {
  idle: 'bg-white border-line text-ink active:border-b-2 active:translate-y-[2px] active:bg-surface',
  correct: 'bg-good-soft border-good text-good-deep',
  wrong: 'bg-bad-soft border-bad text-bad-deep animate-shake',
  dim: 'bg-white border-line text-faint',
}

/** One answer option of a quiz. Locked once any option has been chosen. */
export function Choice({
  label,
  state = 'idle',
  english = false,
  onClick,
}: {
  label: string
  state?: ChoiceState
  english?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state !== 'idle'}
      className={`flex min-h-14 w-full items-center rounded-2xl border-2 border-b-4 px-4 py-3 text-left text-[17px] font-bold transition-transform duration-75 ${
        english ? 'font-en text-lg' : ''
      } ${STATES[state]}`}
    >
      {label}
    </button>
  )
}
