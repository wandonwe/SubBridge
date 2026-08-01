import type { OutputFormat, SetStrategy } from '@subbridge/core'
import { isSetStrategy } from '@subbridge/core'

export type RulePresetOption = 'lite' | 'default' | 'full' | 'none'

export interface AdvancedOptions {
  include: string
  exclude: string
  rename: string
  prefix: string
  dedupe: boolean
  sort: boolean
  urlTest: boolean
  fallback: boolean
  rules: RulePresetOption
}

export const DEFAULT_ADVANCED: AdvancedOptions = {
  include: '',
  exclude: '',
  rename: '',
  prefix: '',
  dedupe: false,
  sort: false,
  urlTest: true,
  fallback: true,
  rules: 'default',
}

export const RULE_PRESETS: { value: RulePresetOption; label: string; hint: string }[] = [
  { value: 'default', label: 'Default', hint: 'Balanced Matrix policy — recommended' },
  { value: 'full', label: 'Full', hint: '+ Gemini, Disney+, Prime Video, games, Telegram IPs' },
  { value: 'lite', label: 'Lite', hint: 'Minimal & fastest: ads / CN / global only' },
  { value: 'none', label: 'None', hint: 'No rules — everything through Proxy' },
]

export interface UrlEntry {
  url: string
  /** Optional node-set name, e.g. "Prime" from a `Prime https://…` line. */
  group?: string
  /** Optional scheduling strategy from a `Prime,auto https://…` line. */
  strategy?: SetStrategy
}

/** Build the /api/convert URL for the given inputs. */
export function buildConvertUrl(
  origin: string,
  entries: UrlEntry[],
  target: OutputFormat,
  advanced: AdvancedOptions,
  profileName?: string,
): string {
  const params = new URLSearchParams()
  for (const entry of entries) params.append('url', entry.url)
  const name = profileName?.trim()
  if (name && name !== 'SubBridge') params.set('filename', name)
  // If any line is named, every subscription gets a set name (auto-filled).
  if (entries.some((e) => e.group)) {
    entries.forEach((entry, i) => {
      const name = entry.group ?? `Set ${i + 1}`
      params.append('group', entry.strategy ? `${name},${entry.strategy}` : name)
    })
  }
  params.set('target', target)
  if (advanced.include.trim()) params.set('include', advanced.include.trim())
  if (advanced.exclude.trim()) params.set('exclude', advanced.exclude.trim())
  for (const rule of advanced.rename.split('\n')) {
    if (rule.includes('->')) params.append('rename', rule.trim())
  }
  if (advanced.prefix) params.set('prefix', advanced.prefix)
  if (advanced.dedupe) params.set('dedupe', '1')
  if (advanced.sort) params.set('sort', '1')
  if (!advanced.urlTest) params.set('urltest', '0')
  if (!advanced.fallback) params.set('fallback', '0')
  if (advanced.rules !== 'default') params.set('rules', advanced.rules)
  return `${origin}/api/convert?${params.toString()}`
}

/**
 * Split the textarea value into subscription entries. Each line holds one
 * URL, optionally prefixed with a node-set name and scheduling strategy:
 *
 *   https://example.com/sub                → pooled (no set)
 *   Prime https://example.com/sub-a        → set "Prime" (manual select)
 *   Prime,auto https://example.com/sub-a   → set "Prime", auto url-test
 *   Backup,fallback https://example.com/b  → set "Backup", failover
 */
export function parseUrlInput(value: string): UrlEntry[] {
  const entries: UrlEntry[] = []
  for (const line of value.split('\n')) {
    const match = line.match(/^(.*?)(https?:\/\/\S+)\s*$/i)
    if (!match?.[2]) continue
    const prefix = (match[1] ?? '').replace(/[\s:@|,=–-]+$/, '').trim()
    if (!prefix) {
      entries.push({ url: match[2] })
      continue
    }
    const sep = prefix.search(/[,，]/)
    const group = (sep === -1 ? prefix : prefix.slice(0, sep)).trim()
    const strategyRaw =
      sep === -1
        ? ''
        : prefix
            .slice(sep + 1)
            .trim()
            .toLowerCase()
    const entry: UrlEntry = group ? { url: match[2], group } : { url: match[2] }
    if (strategyRaw && isSetStrategy(strategyRaw) && strategyRaw !== 'select') {
      entry.strategy = strategyRaw
    }
    entries.push(entry)
  }
  return entries
}
