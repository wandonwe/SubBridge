import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from './cn'

const fieldClasses =
  'w-full rounded-2xl border border-black/[0.06] dark:border-white/10 ' +
  'bg-white/60 dark:bg-white/[0.06] backdrop-blur-xl ' +
  'px-4 text-[15px] text-[--color-label] placeholder:text-[--color-label-tertiary] ' +
  'transition-all duration-200 outline-none ' +
  'focus:border-blue-500/50 focus:bg-white/80 dark:focus:bg-white/[0.09] ' +
  'focus:ring-4 focus:ring-blue-500/15'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClasses, 'h-12', className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(fieldClasses, 'min-h-[96px] py-3 resize-y', className)} {...props} />
  )
}
