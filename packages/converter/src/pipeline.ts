import type { ConvertOptions, ProxyNode } from '@subbridge/core'

/**
 * Node post-processing pipeline: filter → rename → prefix → dedupe → sort →
 * uniquify. Applied between parsing and rendering, identically for every
 * output format.
 */
export function applyPipeline(nodes: ProxyNode[], options: ConvertOptions = {}): ProxyNode[] {
  let out = [...nodes]

  if (options.include) {
    const re = safeRegex(options.include)
    if (re) out = out.filter((n) => re.test(n.name))
  }
  if (options.exclude) {
    const re = safeRegex(options.exclude)
    if (re) out = out.filter((n) => !re.test(n.name))
  }

  if (options.rename?.length) {
    const rules = options.rename
      .map((rule) => {
        const sep = rule.indexOf('->')
        if (sep === -1) return null
        const re = safeRegex(rule.slice(0, sep))
        return re ? ([re, rule.slice(sep + 2)] as const) : null
      })
      .filter((r) => r !== null)
    out = out.map((n) => {
      let name = n.name
      for (const [re, replacement] of rules) name = name.replace(re, replacement)
      return { ...n, name: name.trim() || n.name }
    })
  }

  if (options.prefix) {
    const prefix = options.prefix
    out = out.map((n) => ({ ...n, name: `${prefix}${n.name}` }))
  }

  if (options.dedupe) {
    const seen = new Set<string>()
    out = out.filter((n) => {
      const key = `${n.protocol}|${n.server}|${n.port}|${'uuid' in n ? n.uuid : ''}|${
        'password' in n ? n.password : ''
      }`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  if (options.sort) {
    out.sort((a, b) => a.name.localeCompare(b.name, 'en'))
  }

  return uniquifyNames(out)
}

/** Clients reject configs with duplicate proxy names — append ` 2`, ` 3`, … */
function uniquifyNames(nodes: ProxyNode[]): ProxyNode[] {
  const counts = new Map<string, number>()
  return nodes.map((n) => {
    const count = (counts.get(n.name) ?? 0) + 1
    counts.set(n.name, count)
    return count === 1 ? n : { ...n, name: `${n.name} ${count}` }
  })
}

function safeRegex(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern)
  } catch {
    return null
  }
}
