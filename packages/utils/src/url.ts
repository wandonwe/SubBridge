/** Split `host:port` handling bracketed IPv6 literals. */
export function splitHostPort(input: string): { host: string; port: number } {
  const m6 = input.match(/^\[(.+)\]:(\d+)$/)
  if (m6?.[1] && m6[2]) return { host: m6[1], port: Number(m6[2]) }
  const idx = input.lastIndexOf(':')
  if (idx === -1) throw new Error(`missing port in "${input}"`)
  return { host: input.slice(0, idx), port: Number(input.slice(idx + 1)) }
}

/** decodeURIComponent that falls back to the raw value on malformed input. */
export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** Parse a query string into a plain record (last value wins). */
export function parseQuery(query: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of new URLSearchParams(query)) out[k] = v
  return out
}

export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port > 0 && port < 65536
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
