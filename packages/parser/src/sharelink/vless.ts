import type { VlessNode } from '@subbridge/core'
import { ParseError } from '@subbridge/core'
import { safeDecode } from '@subbridge/utils'
import { splitUri, tlsFromQuery, transportFromQuery } from './common'

/** Standard vless links: `vless://uuid@host:port?params#name`. */
export function parseVless(link: string): VlessNode {
  const { scheme, userinfo, host, port, query, fragment } = splitUri(link)
  if (scheme !== 'vless') throw new ParseError('not a vless link', link)
  const uuid = safeDecode(userinfo)
  if (!uuid) throw new ParseError('vless link missing uuid', link)

  const node: VlessNode = {
    protocol: 'vless',
    name: fragment || `${host}:${port}`,
    server: host,
    port,
    uuid,
    udp: true,
  }
  if (query.flow) node.flow = query.flow

  const tls = tlsFromQuery(query)
  if (tls) node.tls = tls
  const transport = transportFromQuery(query)
  if (transport) node.transport = transport

  return node
}
