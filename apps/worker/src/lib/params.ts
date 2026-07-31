import type { ConvertOptions, OutputFormat } from '@subbridge/core'
import { isOutputFormat } from '@subbridge/core'
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
  const groups = params
    .getAll('group')
    .map((g) => g.trim())
    .filter(Boolean)
  if (groups.length > 0) {
    if (groups.length > urls.length) {
      throw new BadRequestError('more `group` names than `url` values')
    }
    for (const name of groups) {
      if (!/^[\p{L}\p{N} _.-]{1,24}$/u.test(name)) {
        throw new BadRequestError(`invalid group name "${name}"`)
      }
      if (RESERVED_GROUP_NAMES.has(name.toLowerCase())) {
        throw new BadRequestError(`group name "${name}" is reserved`)
      }
    }
    if (new Set(groups.map((g) => g.toLowerCase())).size !== groups.length) {
      throw new BadRequestError('duplicate group names')
    }
    // Pad unnamed subscriptions so every URL lands in a set.
    options.groups = urls.map((_, i) => groups[i] ?? `Set ${i + 1}`)
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
  const rules = params.get('rules')
  if (rules === 'none' || rules === 'default') options.rules = rules
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
  return name.replace(/[^\w.\- ]/g, '').slice(0, 64) || 'subbridge'
}
