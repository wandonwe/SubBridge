import type { TlsOptions, TransportOptions, TransportType } from '@subbridge/core'
import { ParseError } from '@subbridge/core'
import { isValidPort, parseQuery, safeDecode, splitHostPort } from '@subbridge/utils'

export interface UriParts {
  scheme: string
  /** Raw (still percent-encoded) userinfo, empty string when absent. */
  userinfo: string
  host: string
  port: number
  query: Record<string, string>
  /** Decoded fragment — used as node name. */
  fragment: string
}

/**
 * Minimal URI splitter for proxy share links.
 *
 * `new URL()` mangles non-special schemes differently across runtimes and
 * chokes on the unencoded characters real-world links contain, so we parse
 * by hand: scheme://[userinfo@]host[:port][/path][?query][#fragment]
 */
export function splitUri(raw: string): UriParts {
  const link = raw.trim()
  const schemeMatch = link.match(/^([a-z][a-z0-9+.-]*):\/\//i)
  if (!schemeMatch?.[1]) throw new ParseError('not a share link', link)
  const scheme = schemeMatch[1].toLowerCase()
  let rest = link.slice(schemeMatch[0].length)

  let fragment = ''
  const hashIdx = rest.indexOf('#')
  if (hashIdx !== -1) {
    fragment = safeDecode(rest.slice(hashIdx + 1))
    rest = rest.slice(0, hashIdx)
  }

  let query: Record<string, string> = {}
  const qIdx = rest.indexOf('?')
  if (qIdx !== -1) {
    query = parseQuery(rest.slice(qIdx + 1))
    rest = rest.slice(0, qIdx)
  }

  const slashIdx = rest.indexOf('/')
  if (slashIdx !== -1) rest = rest.slice(0, slashIdx)

  let userinfo = ''
  const atIdx = rest.lastIndexOf('@')
  if (atIdx !== -1) {
    userinfo = rest.slice(0, atIdx)
    rest = rest.slice(atIdx + 1)
  }

  const { host, port } = splitHostPort(rest)
  if (!host || !isValidPort(port)) throw new ParseError(`invalid host/port in "${raw}"`)

  return { scheme, userinfo, host, port, query, fragment }
}

/** Build TLS options from the common query-parameter vocabulary. */
export function tlsFromQuery(q: Record<string, string>, forced = false): TlsOptions | undefined {
  const security = q.security ?? ''
  const enabled = forced || security === 'tls' || security === 'reality'
  if (!enabled) return undefined
  const tls: TlsOptions = { enabled: true }
  const sni = q.sni ?? q.peer
  if (sni) tls.serverName = sni
  if (q.alpn) tls.alpn = q.alpn.split(',').filter(Boolean)
  if (q.allowInsecure === '1' || q.allowInsecure === 'true' || q.insecure === '1') {
    tls.insecure = true
  }
  if (q.fp) tls.fingerprint = q.fp
  if (security === 'reality' && q.pbk) {
    tls.reality = { publicKey: q.pbk, ...(q.sid ? { shortId: q.sid } : {}) }
  }
  return tls
}

/** Build transport options from the common query-parameter vocabulary. */
export function transportFromQuery(q: Record<string, string>): TransportOptions | undefined {
  const type = (q.type ?? 'tcp') as TransportType
  if (type === 'tcp' && !q.headerType) return undefined
  const t: TransportOptions = { type }
  if (q.path) t.path = safeDecode(q.path)
  if (q.host) t.host = q.host
  const service = q.serviceName ?? q.servicename
  if (service) t.serviceName = service
  return t
}
