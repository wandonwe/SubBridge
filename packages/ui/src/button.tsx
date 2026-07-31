import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

type Variant = 'primary' | 'glass' | 'ghost' | 'destructive'
type Size = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-lg shadow-blue-500/30 ' +
    'hover:shadow-blue-500/40 hover:brightness-105 active:scale-[0.98] active:brightness-95',
  glass: 'glass text-[--color-label] hover:bg-white/60 dark:hover:bg-white/10 active:scale-[0.98]',
  ghost:
    'text-[--color-label-secondary] hover:bg-black/5 dark:hover:bg-white/10 active:scale-[0.98]',
  destructive:
    'bg-gradient-to-b from-red-400 to-red-600 text-white shadow-lg shadow-red-500/25 ' +
    'active:scale-[0.98]',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-[13px] rounded-full',
  md: 'h-10 px-5 text-[15px] rounded-full',
  lg: 'h-[52px] px-8 text-[17px] rounded-[18px]',
  icon: 'h-9 w-9 rounded-full',
}

/** Apple-style pill button with pressed-state scaling. */
export function Button({ className, variant = 'primary', size = 'md', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 font-medium',
        'transition-all duration-200 ease-out outline-none',
        'focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-40',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
