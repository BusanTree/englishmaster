import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'good' | 'bad' | 'inverse'
type Size = 'lg' | 'md' | 'sm'

// Filled buttons get a darker bottom edge that flattens when pressed, so taps feel physical.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white border-b-4 border-brand-deep active:border-b-2 active:translate-y-[2px]',
  good: 'bg-good text-white border-b-4 border-good-deep active:border-b-2 active:translate-y-[2px]',
  bad: 'bg-bad text-white border-b-4 border-bad-deep active:border-b-2 active:translate-y-[2px]',
  inverse: 'bg-white text-brand border-b-4 border-brand-deep/40 active:border-b-2 active:translate-y-[2px]',
  secondary: 'bg-white text-ink border-2 border-b-4 border-line active:border-b-2 active:translate-y-[2px]',
  ghost: 'bg-transparent text-muted active:bg-surface',
}

const SIZES: Record<Size, string> = {
  lg: 'min-h-14 px-6 text-[17px] rounded-2xl',
  md: 'min-h-12 px-5 text-base rounded-2xl',
  sm: 'min-h-10 px-4 text-sm rounded-xl',
}

export function Button({
  variant = 'primary',
  size = 'lg',
  block = false,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: Size; block?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex select-none items-center justify-center gap-2 font-bold transition-[transform,border-width] duration-75 disabled:pointer-events-none disabled:opacity-40 ${
        VARIANTS[variant]
      } ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
    />
  )
}
