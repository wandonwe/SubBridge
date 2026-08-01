import type { ConvertOptions, OutputFormat, SetStrategy } from '@subbridge/core'
import { isOutputFormat, isSetStrategy } from '@subbridge/core'
import { isHttpUrl } from '@subbridge/utils'

export interface ConvertRequest {
  urls: string[]
  target: OutputFormat
  options: ConvertOptions
  filename?: string
}

export class BadRequestError extends Error {}

/** Names that would collide with policy groups or built-in policies. */
const RESERVED_GROUP_NAMES = new Set([
  'direct',
  'reject',
  'reject-drop',
  'proxy',
  'auto',
  'fallback',
  'final',
  'guard',
  'media',
  'microsoft',
  'openai',
  'claude',
  'download',
])

/**
 * Parse and validate the /api/convert query vocabulary.
 *
 *   url      one or more subscription URLs (repeatable, or `|`-separated)
 *   target   output format (default mihomo)
 *   include / exclude   node-name regex filters
 *   rename   repeatable `search->replace` rules
 *   prefix, dedupe, sort, urltest, rules, ua, filename
 */
export function parseConvertParams(params: URLSearchParams): ConvertRequest {
  const urls = params
    .getAll('url')
    .flatMap((u) => u.split('|'))
    .map((u) => u.trim())
    .filter(Boolean)
  if (urls.length === 0) throw new BadRequestError('missing `url` parameter')
  if (urls.length > 8) throw new BadRequestError('too many subscription urls (max 8)')
  for (const u of urls) {
    if (!isHttpUrl(u)) throw new BadRequestError(`not an http(s) url: ${u}`)
  }

  const target = params.get('target') ?? 'mihomo'
  if (!isOutputFormat(target)) throw new BadRequestError(`unknown target "${target}"`)

  const options: ConvertOptions = {}
  // `group` values: "Prime" (manual select), "Prime,auto" (url-test) or
  // "Prime,fallback" (first healthy member).
  const rawGroups = params
    .getAll('group')
    .map((g) => g.trim())
    .filter(Boolean)
  if (rawGroups.length > 0) {
    if (rawGroups.length > urls.length) {
      throw new BadRequestError('more `group` names than `url` values')
    }
    const names: string[] = []
    const strategies: Record<string, SetStrategy> = {}
    for (const raw of rawGroups) {
      const sep = raw.indexOf(',')
      const name = (sep === -1 ? raw : raw.slice(0, sep)).trim()
      const strategyRaw =
        sep === -1
          ? 'select'
          : raw
              .slice(sep + 1)
              .trim()
              .toLowerCase()
      if (!/^[\p{L}\p{N} _.-]{1,24}$/u.test(name)) {
        throw new BadRequestError(`invalid group name "${name}"`)
      }
      if (RESERVED_GROUP_NAMES.has(name.toLowerCase())) {
        throw new BadRequestError(`group name "${name}" is reserved`)
      }
      if (!isSetStrategy(strategyRaw)) {
        throw new BadRequestError(
          `invalid strategy "${strategyRaw}" for group "${name}" (use auto, fallback or select)`,
        )
      }
      names.push(name)
      if (strategyRaw !== 'select') strategies[name] = strategyRaw
    }
    if (new Set(names.map((g) => g.toLowerCase())).size !== names.length) {
      throw new BadRequestError('duplicate group names')
    }
    // Pad unnamed subscriptions so every URL lands in a set.
    options.groups = urls.map((_, i) => names[i] ?? `Set ${i + 1}`)
    if (Object.keys(strategies).length > 0) options.setStrategies = strategies
  }
  const include = params.get('include')
  if (include) options.include = include
  const exclude = params.get('exclude')
  if (exclude) options.exclude = exclude
  const rename = params.getAll('rename').filter(Boolean)
  if (rename.length > 0) options.rename = rename
  const prefix = params.get('prefix')
  if (prefix) options.prefix = prefix
  if (flag(params, 'dedupe')) options.dedupe = true
  if (flag(params, 'sort')) options.sort = true
  if (params.get('urltest') !== null) options.urlTest = flag(params, 'urltest')
  if (params.get('fallback') !== null) options.fallback = flag(params, 'fallback')
  const rules = params.get('rules')
  if (rules === 'none' || rules === 'default' || rules === 'lite' || rules === 'full') {
    options.rules = rules
  }
  const ua = params.get('ua')
  if (ua) options.userAgent = ua

  const req: ConvertRequest = { urls, target, options }
  const filename = params.get('filename')
  if (filename) req.filename = sanitizeFilename(filename)
  return req
}

function flag(params: URLSearchParams, name: string): boolean {
  const v = params.get(name)
  return v === '1' || v === 'true' || v === 'yes'
}

function sanitizeFilename(name: string): string {
  // Allow letters (incl. CJK), digits, spaces and a few safe punctuation
  // marks; strip control chars, quotes, slashes and anything header-unsafe.
  return (
    name
      .replace(/[\p{Cc}\p{Cf}"\\/\r\n]/gu, '')
      .replace(/[^\p{L}\p{N} ._\-[\]()]/gu, '')
      .trim()
      .slice(0, 48) || 'SubBridge'
  )
}
