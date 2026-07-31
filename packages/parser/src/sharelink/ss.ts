import type { ShadowsocksNode } from '@subbridge/core'
import { ParseError } from '@subbridge/core'
import { safeDecode, splitHostPort, tryB64decode } from '@subbridge/utils'
import { splitUri } from './common'

/**
 * Shadowsocks share links, supporting both SIP002 and the legacy form:
 *
 *   SIP002:  ss://base64url(method:password)@host:port/?plugin=...#name
 *            ss://method:password@host:port#name   (plain userinfo)
 *   Legacy:  ss://base64(method:password@host:port)#name
 */
export function parseSs(link: string): ShadowsocksNode {
  const trimmed = link.trim()
  if (!trimmed.toLowerCase().startsWith('ss://')) throw new ParseError('not an ss link', link)

  // Legacy form: everything after ss:// (before #) is one base64 blob.
  const body = trimmed.slice(5).split('#')[0] ?? ''
  if (!body.includes('@')) {
    const decoded = tryB64decode(body.split('?')[0] ?? '')
    if (!decoded?.includes('@')) throw new ParseError('unrecognised ss link', link)
    const at = decoded.lastIndexOf('@')
    const cred = decoded.slice(0, at)
    const { host, port } = splitHostPort(decoded.slice(at + 1))
    const [method, ...passwordParts] = cred.split(':')
    if (!method || passwordParts.length === 0) throw new ParseError('bad ss credentials', link)
    return {
      protocol: 'ss',
      name: nameOf(trimmed, host, port),
      server: host,
      port,
      method,
      password: passwordParts.join(':'),
      udp: true,
    }
  }

  const { userinfo, host, port, query, fragment } = splitUri(trimmed)
  const rawCred = safeDecode(userinfo)
  const cred = rawCred.includes(':') ? rawCred : (tryB64decode(rawCred) ?? rawCred)
  const sep = cred.indexOf(':')
  if (sep === -1) throw new ParseError('bad ss credentials', link)

  const node: ShadowsocksNode = {
    protocol: 'ss',
    name: fragment || `${host}:${port}`,
    server: host,
    port,
    method: cred.slice(0, sep),
    password: cred.slice(sep + 1),
    udp: true,
  }
  if (query.plugin) {
    const [plugin, ...opts] = safeDecode(query.plugin).split(';')
    if (plugin) node.plugin = plugin
    if (opts.length > 0) node.pluginOpts = opts.join(';')
  }
  return node
}

function nameOf(link: string, host: string, port: number): string {
  const hashIdx = link.indexOf('#')
  return hashIdx === -1 ? `${host}:${port}` : safeDecode(link.slice(hashIdx + 1))
}
