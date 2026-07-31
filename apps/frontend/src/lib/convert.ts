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

/** Build the /api/convert URL for the given inputs. */
export function buildConvertUrl(
  origin: string,
  subscriptionUrls: string[],
  target: OutputFormat,
  advanced: AdvancedOptions,
): string {
  const params = new URLSearchParams()
  for (const url of subscriptionUrls) params.append('url', url)
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

/** Split the textarea value into clean subscription URLs. */
export function parseUrlInput(value: string): string[] {
  return value
    .split(/[\n|]/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s))
}
