import type { OutputFormat } from '@subbridge/core'
import { Button, GlassCard, Select, Textarea } from '@subbridge/ui'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Copy, ExternalLink, Link2, QrCode } from 'lucide-react'
import { useMemo, useState } from 'react'
import { apiOrigin } from '@/lib/api'
import { buildConvertUrl, DEFAULT_ADVANCED, parseUrlInput } from '@/lib/convert'
import { CLIENT_SCHEMES, FORMATS } from '@/lib/formats'
import { addHistory, type HistoryEntry } from '@/lib/history'
import { AdvancedOptions } from './AdvancedOptions'

interface Props {
  onGenerated: (history: HistoryEntry[]) => void
  onShowQr: (url: string) => void
}

export function ConverterCard({ onGenerated, onShowQr }: Props) {
  const [input, setInput] = useState('')
  const [target, setTarget] = useState<OutputFormat>('mihomo')
  const [advanced, setAdvanced] = useState(DEFAULT_ADVANCED)
  const [result, setResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const urls = useMemo(() => parseUrlInput(input), [input])
  const formatMeta = FORMATS.find((f) => f.value === target)

  const generate = () => {
    if (urls.length === 0) {
      setError('Paste at least one valid http(s) subscription URL.')
      return
    }
    setError(null)
    const convertUrl = buildConvertUrl(apiOrigin(), urls, target, advanced)
    setResult(convertUrl)
    setCopied(false)
    onGenerated(
      addHistory({
        id: crypto.randomUUID(),
        convertUrl,
        target,
        sourceCount: urls.length,
        createdAt: Date.now(),
      }),
    )
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // clipboard unavailable (non-secure context)
    }
  }

  const openInClient = CLIENT_SCHEMES[target]

  return (
    <GlassCard className="mx-auto w-full max-w-2xl">
      <div className="space-y-5">
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-[--color-label-secondary]">
            <Link2 className="h-3.5 w-3.5" />
            Subscription URL
          </span>
          <Textarea
            placeholder={
              'https://example.com/your-subscription\n' +
              'Merge more by adding lines — name them to keep separate sets:\n' +
              'Prime https://example.com/sub-a\nBackup https://example.com/sub-b'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="url"
          />
          {urls.length > 1 && (
            <span className="mt-1.5 block text-[13px] text-[--color-label-secondary]">
              {urls.length} subscriptions will be merged
              {urls.some((u) => u.group) &&
                ` into sets: ${urls.map((u, i) => u.group ?? `Set ${i + 1}`).join(', ')}`}
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-[--color-label-secondary]">
            Output format
          </span>
          <Select value={target} onChange={(e) => setTarget(e.target.value as OutputFormat)}>
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
          {formatMeta && (
            <span className="mt-1.5 block text-[13px] text-[--color-label-tertiary]">
              {formatMeta.hint}
            </span>
          )}
        </label>

        <AdvancedOptions value={advanced} onChange={setAdvanced} />

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[14px] font-medium text-red-500"
            role="alert"
          >
            {error}
          </motion.p>
        )}

        <Button size="lg" className="w-full" onClick={generate}>
          Generate Subscription
          <ArrowRight className="h-[18px] w-[18px]" />
        </Button>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-black/[0.06] bg-white/50 p-4 dark:border-white/10 dark:bg-white/[0.05]">
                <p className="break-all font-mono text-[12px] leading-relaxed text-[--color-label-secondary]">
                  {result}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="glass" size="sm" onClick={() => copy(result)}>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button variant="glass" size="sm" onClick={() => onShowQr(result)}>
                    <QrCode className="h-4 w-4" />
                    QR Code
                  </Button>
                  {openInClient && (
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => {
                        window.location.href = openInClient(result)
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open in client
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  )
}
