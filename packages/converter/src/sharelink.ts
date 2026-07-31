import type { ProxyNode } from '@subbridge/core'
import { b64encode, b64encodeUrl } from '@subbridge/utils'

/** Render a canonical node back into a standard share link. */
export function toShareLink(node: ProxyNode): string {
  switch (node.protocol) {
    case 'ss':
      return ssLink(node)
    case 'vmess':
      return vmessLink(node)
    case 'vless':
      return uriLink('vless', node.uuid, node, vlessQuery(node))
    case 'trojan':
      return uriLink('trojan', node.password, node, trojanQuery(node))
    case 'hysteria2':
      return uriLink('hysteria2', node.password, node, hysteria2Query(node))
    case 'tuic':
      return uriLink('tuic', `${node.uuid}:${node.password}`, node, tuicQuery(node))
  }
}

/** Render all nodes as newline-separated share links. */
export function toShareLinks(nodes: ProxyNode[]): string {
  return nodes.map(toShareLink).join('\n')
}

/** Classic base64 subscription payload (what Shadowrocket & v2ray expect). */
export function toBase64Subscription(nodes: ProxyNode[]): string {
  return b64encode(`${toShareLinks(nodes)}\n`)
}

function host(node: ProxyNode): string {
  return node.server.includes(':') ? `[${node.server}]` : node.server
}

function uriLink(
  scheme: string,
  userinfo: string,
  node: ProxyNode,
  query: URLSearchParams,
): string {
  const qs = query.toString()
  return `${scheme}://${encodeURIComponent(userinfo)}@${host(node)}:${node.port}${
    qs ? `?${qs}` : ''
  }#${encodeURIComponent(node.name)}`
}

function ssLink(node: Extract<ProxyNode, { protocol: 'ss' }>): string {
  const userinfo = b64encodeUrl(`${node.method}:${node.password}`)
  const query = new URLSearchParams()
  if (node.plugin) {
    query.set('plugin', node.pluginOpts ? `${node.plugin};${node.pluginOpts}` : node.plugin)
  }
  const qs = query.toString()
  return `ss://${userinfo}@${host(node)}:${node.port}${qs ? `/?${qs}` : ''}#${encodeURIComponent(
    node.name,
  )}`
}

function vmessLink(node: Extract<ProxyNode, { protocol: 'vmess' }>): string {
  const json: Record<string, string | number> = {
    v: '2',
    ps: node.name,
    add: node.server,
    port: String(node.port),
    id: node.uuid,
    aid: String(node.alterId),
    scy: node.security,
    net: node.transport?.type ?? 'tcp',
    type: 'none',
    host: node.transport?.host ?? '',
    path: node.transport?.path ?? node.transport?.serviceName ?? '',
    tls: node.tls?.enabled ? 'tls' : '',
  }
  if (node.tls?.serverName) json.sni = node.tls.serverName
  if (node.tls?.alpn?.length) json.alpn = node.tls.alpn.join(',')
  if (node.tls?.fingerprint) json.fp = node.tls.fingerprint
  return `vmess://${b64encode(JSON.stringify(json))}`
}

function commonTlsQuery(node: ProxyNode, query: URLSearchParams): void {
  const tls = node.tls
  if (!tls?.enabled) return
  if (tls.serverName) query.set('sni', tls.serverName)
  if (tls.alpn?.length) query.set('alpn', tls.alpn.join(','))
  if (tls.insecure) query.set('allowInsecure', '1')
  if (tls.fingerprint) query.set('fp', tls.fingerprint)
}

function commonTransportQuery(node: ProxyNode, query: URLSearchParams): void {
  const t = node.transport
  if (!t) return
  query.set('type', t.type)
  if (t.path) query.set('path', t.path)
  if (t.host) query.set('host', t.host)
  if (t.serviceName) query.set('serviceName', t.serviceName)
}

function vlessQuery(node: Extract<ProxyNode, { protocol: 'vless' }>): URLSearchParams {
  const query = new URLSearchParams()
  query.set('type', node.transport?.type ?? 'tcp')
  if (node.tls?.reality) {
    query.set('security', 'reality')
    query.set('pbk', node.tls.reality.publicKey)
    if (node.tls.reality.shortId) query.set('sid', node.tls.reality.shortId)
  } else if (node.tls?.enabled) {
    query.set('security', 'tls')
  }
  if (node.flow) query.set('flow', node.flow)
  commonTlsQuery(node, query)
  commonTransportQuery(node, query)
  return query
}

function trojanQuery(node: Extract<ProxyNode, { protocol: 'trojan' }>): URLSearchParams {
  const query = new URLSearchParams()
  commonTlsQuery(node, query)
  commonTransportQuery(node, query)
  return query
}

function hysteria2Query(node: Extract<ProxyNode, { protocol: 'hysteria2' }>): URLSearchParams {
  const query = new URLSearchParams()
  if (node.tls?.serverName) query.set('sni', node.tls.serverName)
  if (node.tls?.insecure) query.set('insecure', '1')
  if (node.obfs) query.set('obfs', node.obfs)
  if (node.obfsPassword) query.set('obfs-password', node.obfsPassword)
  if (node.upMbps) query.set('up', String(node.upMbps))
  if (node.downMbps) query.set('down', String(node.downMbps))
  return query
}

function tuicQuery(node: Extract<ProxyNode, { protocol: 'tuic' }>): URLSearchParams {
  const query = new URLSearchParams()
  if (node.tls?.serverName) query.set('sni', node.tls.serverName)
  if (node.tls?.alpn?.length) query.set('alpn', node.tls.alpn.join(','))
  if (node.congestionControl) query.set('congestion_control', node.congestionControl)
  if (node.udpRelayMode) query.set('udp_relay_mode', node.udpRelayMode)
  return query
}
