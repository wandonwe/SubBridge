import type { TrojanNode } from '@subbridge/core'
import { ParseError } from '@subbridge/core'
import { safeDecode } from '@subbridge/utils'
import { splitUri, tlsFromQuery, transportFromQuery } from './common'

/** Trojan links: `trojan://password@host:port?params#name` (TLS implied). */
export function parseTrojan(link: string): TrojanNode {
  const { scheme, userinfo, host, port, query, fragment } = splitUri(link)
  if (scheme !== 'trojan') throw new ParseError('not a trojan link', link)
  const password = safeDecode(userinfo)
  if (!password) throw new ParseError('trojan link missing password', link)

  const node: TrojanNode = {
    protocol: 'trojan',
    name: fragment || `${host}:${port}`,
    server: host,
    port,
    password,
    udp: true,
    tls: tlsFromQuery(query, true),
  }
  const transport = transportFromQuery(query)
  if (transport) node.transport = transport

  return node
}
