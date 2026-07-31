import type { SelectHTMLAttributes } from 'react'
import { cn } from './cn'

/**
 * Styled native select — native pickers behave best on iOS, which matters
 * for a mobile-first product. The chevron is drawn via an inline SVG mask.
 */
export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          'h-12 w-full appearance-none rounded-2xl border border-black/[0.06] dark:border-white/10',
          'bg-white/60 dark:bg-white/[0.06] backdrop-blur-xl',
          'pl-4 pr-10 text-[15px] text-[--color-label]',
          'transition-all duration-200 outline-none cursor-pointer',
          'focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/15',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-label-tertiary]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m8 9 4-4 4 4m0 6-4 4-4-4" />
      </svg>
    </div>
  )
}
