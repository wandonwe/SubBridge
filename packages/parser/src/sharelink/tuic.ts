import type { TuicNode } from '@subbridge/core'
import { ParseError } from '@subbridge/core'
import { safeDecode } from '@subbridge/utils'
import { splitUri } from './common'

/** TUIC v5 links: `tuic://uuid:password@host:port?params#name`. */
export function parseTuic(link: string): TuicNode {
  const { scheme, userinfo, host, port, query, fragment } = splitUri(link)
  if (scheme !== 'tuic') throw new ParseError('not a tuic link', link)

  const decoded = safeDecode(userinfo)
  const sep = decoded.indexOf(':')
  if (sep === -1) throw new ParseError('tuic link missing uuid:password', link)

  const node: TuicNode = {
    protocol: 'tuic',
    name: fragment || `${host}:${port}`,
    server: host,
    port,
    uuid: decoded.slice(0, sep),
    password: decoded.slice(sep + 1),
    udp: true,
    tls: { enabled: true },
  }
  if (query.sni && node.tls) node.tls.serverName = query.sni
  if (query.alpn && node.tls) node.tls.alpn = query.alpn.split(',').filter(Boolean)
  if ((query.allow_insecure === '1' || query.insecure === '1') && node.tls) node.tls.insecure = true
  const cc = query.congestion_control ?? query.congestion
  if (cc) node.congestionControl = cc
  if (query.udp_relay_mode) node.udpRelayMode = query.udp_relay_mode

  return node
}
