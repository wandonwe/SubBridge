import type { Hysteria2Node } from '@subbridge/core'
import { ParseError } from '@subbridge/core'
import { safeDecode } from '@subbridge/utils'
import { splitUri } from './common'

/** Hysteria2 links: `hysteria2://auth@host:port?params#name` (also `hy2://`). */
export function parseHysteria2(link: string): Hysteria2Node {
  const { scheme, userinfo, host, port, query, fragment } = splitUri(link)
  if (scheme !== 'hysteria2' && scheme !== 'hy2') {
    throw new ParseError('not a hysteria2 link', link)
  }

  const node: Hysteria2Node = {
    protocol: 'hysteria2',
    name: fragment || `${host}:${port}`,
    server: host,
    port,
    password: safeDecode(userinfo),
    udp: true,
    tls: { enabled: true },
  }
  const sni = query.sni ?? query.peer
  if (sni && node.tls) node.tls.serverName = sni
  if ((query.insecure === '1' || query.insecure === 'true') && node.tls) node.tls.insecure = true
  if (query.obfs) node.obfs = query.obfs
  const obfsPassword = query['obfs-password'] ?? query.obfsParam
  if (obfsPassword) node.obfsPassword = obfsPassword
  if (query.up) node.upMbps = Number.parseInt(query.up, 10) || undefined
  if (query.down) node.downMbps = Number.parseInt(query.down, 10) || undefined

  return node
}
