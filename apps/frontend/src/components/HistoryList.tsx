import { Button, GlassCard } from '@subbridge/ui'
import { AnimatePresence, motion } from 'framer-motion'
import { Clock, Copy, QrCode, Share2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { FORMATS } from '@/lib/formats'
import { clearHistory, type HistoryEntry, removeHistory } from '@/lib/history'

interface Props {
  entries: HistoryEntry[]
  onChange: (entries: HistoryEntry[]) => void
  onShowQr: (url: string) => void
}

export function HistoryList({ entries, onChange, onShowQr }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  if (entries.length === 0) return null

  const copy = async (entry: HistoryEntry) => {
    try {
      await navigator.clipboard.writeText(entry.convertUrl)
      setCopiedId(entry.id)
      setTimeout(() => setCopiedId(null), 1400)
    } catch {
      // ignore
    }
  }

  const share = async (entry: HistoryEntry) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SubBridge subscription', url: entry.convertUrl })
      } catch {
        // user cancelled
      }
    } else {
      await copy(entry)
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl" aria-label="Recent history">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[--color-label-secondary]">
          <Clock className="h-4 w-4" />
          Recent
        </h2>
        <Button variant="ghost" size="sm" onClick={() => onChange(clearHistory())}>
          Clear all
        </Button>
      </div>
      <GlassCard className="p-2 sm:p-2">
        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.07]">
          <AnimatePresence initial={false}>
            {entries.map((entry) => {
              const format = FORMATS.find((f) => f.value === entry.target)
              return (
                <motion.li
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-3 px-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">
                      {format?.label ?? entry.target}
                      <span className="ml-2 text-[13px] font-normal text-[--color-label-tertiary]">
                        {entry.sourceCount > 1 ? `${entry.sourceCount} sources` : ''}
                      </span>
                    </p>
                    <p className="truncate font-mono text-[12px] text-[--color-label-secondary]">
                      {entry.convertUrl}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Copy URL"
                      onClick={() => copy(entry)}
                    >
                      <Copy
                        className={`h-4 w-4 ${copiedId === entry.id ? 'text-green-500' : ''}`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Share"
                      onClick={() => share(entry)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Show QR code"
                      onClick={() => onShowQr(entry.convertUrl)}
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete entry"
                      onClick={() => onChange(removeHistory(entry.id))}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      </GlassCard>
    </section>
  )
}
