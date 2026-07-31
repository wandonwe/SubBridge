import type { OutputFormat } from '@subbridge/core'

export interface AdvancedOptions {
  include: string
  exclude: string
  rename: string
  prefix: string
  dedupe: boolean
  sort: boolean
  urlTest: boolean
  rules: boolean
}

export const DEFAULT_ADVANCED: AdvancedOptions = {
  include: '',
  exclude: '',
  rename: '',
  prefix: '',
  dedupe: false,
  sort: false,
  urlTest: true,
  rules: true,
}

export interface UrlEntry {
  url: string
  /** Optional node-set name, e.g. "Prime" from a `Prime https://…` line. */
  group?: string
}

/** Build the /api/convert URL for the given inputs. */
export function buildConvertUrl(
  origin: string,
  entries: UrlEntry[],
  target: OutputFormat,
  advanced: AdvancedOptions,
): string {
  const params = new URLSearchParams()
  for (const entry of entries) params.append('url', entry.url)
  // If any line is named, every subscription gets a set name (auto-filled).
  if (entries.some((e) => e.group)) {
    entries.forEach((entry, i) => {
      params.append('group', entry.group ?? `Set ${i + 1}`)
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
  if (!advanced.rules) params.set('rules', 'none')
  return `${origin}/api/convert?${params.toString()}`
}

/**
 * Split the textarea value into subscription entries. Each line holds one
 * URL, optionally prefixed with a node-set name:
 *
 *   https://example.com/sub          → pooled (no set)
 *   Prime https://example.com/sub-a  → set "Prime"
 *   Backup: https://example.com/b    → set "Backup"
 */
export function parseUrlInput(value: string): UrlEntry[] {
  const entries: UrlEntry[] = []
  for (const line of value.split('\n')) {
    const match = line.match(/^(.*?)(https?:\/\/\S+)\s*$/i)
    if (!match?.[2]) continue
    const group = (match[1] ?? '').replace(/[\s:@|,=–-]+$/, '').trim()
    entries.push(group ? { url: match[2], group } : { url: match[2] })
  }
  return entries
}
