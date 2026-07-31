import { Input, Switch, Textarea } from '@subbridge/ui'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { AdvancedOptions as Options } from '@/lib/convert'

interface Props {
  value: Options
  onChange: (value: Options) => void
}

export function AdvancedOptions({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const set = <K extends keyof Options>(key: K, v: Options[K]) => onChange({ ...value, [key]: v })

  return (
    <div>
      <button
        type="button"
        className="flex items-center gap-1.5 text-[15px] font-medium text-blue-500 transition-opacity hover:opacity-70"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight className="h-4 w-4" />
        </motion.span>
        Advanced options
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="grid gap-4 pt-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-[--color-label-secondary]">
                  Include nodes (regex)
                </span>
                <Input
                  placeholder="HK|SG|JP"
                  value={value.include}
                  onChange={(e) => set('include', e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-[--color-label-secondary]">
                  Exclude nodes (regex)
                </span>
                <Input
                  placeholder="expired|traffic"
                  value={value.exclude}
                  onChange={(e) => set('exclude', e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-[--color-label-secondary]">
                  Name prefix
                </span>
                <Input
                  placeholder="[SB] "
                  value={value.prefix}
                  onChange={(e) => set('prefix', e.target.value)}
                />
              </label>
              <label className="block sm:row-span-2">
                <span className="mb-1.5 block text-[13px] font-medium text-[--color-label-secondary]">
                  Rename rules (one per line, <code className="font-mono">search-&gt;replace</code>)
                </span>
                <Textarea
                  placeholder={'香港->HK\n新加坡->SG'}
                  value={value.rename}
                  onChange={(e) => set('rename', e.target.value)}
                  rows={3}
                />
              </label>
              <div className="flex flex-col gap-3.5 pt-1">
                {(
                  [
                    ['dedupe', 'Deduplicate nodes'],
                    ['sort', 'Sort by name'],
                    ['urlTest', 'Auto url-test group'],
                    ['rules', 'Remote routing rules'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-[15px]">{label}</span>
                    <Switch checked={value[key]} onChange={(v) => set(key, v)} label={label} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
