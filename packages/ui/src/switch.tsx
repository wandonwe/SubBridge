import { cn } from './cn'

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  id?: string
}

/** iOS-style toggle switch. */
export function Switch({ checked, onChange, label, id }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      id={id}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-300 ease-out',
        'outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2',
        checked ? 'bg-[#34c759]' : 'bg-black/[0.09] dark:bg-white/[0.16]',
      )}
    >
      <span
        className={cn(
          'absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white',
          'shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)]',
          'transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          checked && 'translate-x-5',
        )}
      />
    </button>
  )
}
