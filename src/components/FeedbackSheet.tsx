import { CircleCheck, CircleX } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './Button.tsx'

const TONES = {
  good: { panel: 'bg-good-soft', text: 'text-good-deep', button: 'good' as const, Icon: CircleCheck },
  bad: { panel: 'bg-bad-soft', text: 'text-bad-deep', button: 'bad' as const, Icon: CircleX },
}

/** Result sheet that slides up over the answer area after each question. */
export function FeedbackSheet({
  tone,
  title,
  actionLabel,
  onAction,
  children,
}: {
  tone: keyof typeof TONES
  title: string
  actionLabel: string
  onAction: () => void
  children?: ReactNode
}) {
  const t = TONES[tone]
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 animate-sheet-up">
      <div
        role="status"
        aria-live="polite"
        className={`mx-auto max-w-[480px] rounded-t-[28px] px-5 pt-5 pb-[max(env(safe-area-inset-bottom),20px)] ${t.panel}`}
      >
        <p className={`mb-2 flex items-center gap-2 text-xl font-extrabold ${t.text}`}>
          <t.Icon size={26} strokeWidth={2.6} aria-hidden />
          {title}
        </p>
        {children && <div className={`mb-4 ${t.text}`}>{children}</div>}
        <Button variant={t.button} block onClick={onAction} autoFocus>
          {actionLabel}
        </Button>
      </div>
    </div>
  )
}
