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
 *   part     0-based index: convert only that one subscription (used by the
 *            per-set node resources that full Loon / QX profiles reference)
 */
export function parseConvertParams(params: URLSearchParams): ConvertRequest {
  let urls = params
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
  const part = params.get('part')
  if (part !== null) {
    const i = Number(part)
    if (!Number.isInteger(i) || i < 0 || i >= urls.length) {
      throw new BadRequestError(`invalid \`part\` index "${part}"`)
    }
    urls = [urls[i] as string]
    if (options.groups) options.groups = [options.groups[i] as string]
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

/** Full-profile targets and the node-only target their resources point at. */
const RESOURCE_TARGETS: Partial<Record<string, string>> = {
  'quantumultx-conf': 'quantumultx',
  'loon-conf': 'loon',
}

/**
 * Full Loon / Quantumult X profiles reference node subscriptions instead of
 * inlining nodes, so nodes refresh without re-importing the profile. Each
 * named set gets its own resource (same URL, node-only target, `part=i`);
 * without sets there is a single `SubBridge` resource. Works for both
 * /api/convert URLs and /api/share/:id short links (which accept the same
 * `target` / `part` overrides).
 */
export function attachResources(request: ConvertRequest, requestUrl: string): void {
  const nodeTarget = RESOURCE_TARGETS[request.target]
  if (!nodeTarget) return
  const base = new URL(requestUrl)
  base.searchParams.set('target', nodeTarget)
  base.searchParams.delete('part')
  const groups = request.options.groups
  if (groups && groups.length > 0) {
    request.options.resources = groups.map((tag, i) => {
      const u = new URL(base)
      u.searchParams.set('part', String(i))
      return { tag, url: u.toString() }
    })
  } else {
    request.options.resources = [{ tag: 'SubBridge', url: base.toString() }]
  }
}
