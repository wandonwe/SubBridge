import type { HTMLAttributes } from 'react'
import { cn } from './cn'

/** Frosted "liquid glass" surface — the primary container of the app. */
export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'glass rounded-[28px] p-6 sm:p-8',
        'shadow-[0_8px_40px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.5)]',
        'dark:shadow-[0_8px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]',
        className,
      )}
      {...props}
    />
  )
}
