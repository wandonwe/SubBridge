import type { TransportType, VmessNode } from '@subbridge/core'
import { ParseError } from '@subbridge/core'
import { isValidPort, tryB64decode } from '@subbridge/utils'

interface VmessJson {
  v?: string | number
  ps?: string
  add?: string
  port?: string | number
  id?: string
  aid?: string | number
  scy?: string
  net?: string
  type?: string
  host?: string
  path?: string
  tls?: string
  sni?: string
  alpn?: string
  fp?: string
}

/** V2RayN-style vmess links: `vmess://base64(json)`. */
export function parseVmess(link: string): VmessNode {
  const trimmed = link.trim()
  if (!trimmed.toLowerCase().startsWith('vmess://')) throw new ParseError('not a vmess link', link)

  const decoded = tryB64decode(trimmed.slice(8))
  if (!decoded) throw new ParseError('vmess payload is not base64', link)

  let json: VmessJson
  try {
    json = JSON.parse(decoded) as VmessJson
  } catch {
    throw new ParseError('vmess payload is not JSON', link)
  }

  const server = String(json.add ?? '')
  const port = Number(json.port ?? 0)
  const uuid = String(json.id ?? '')
  if (!server || !uuid || !isValidPort(port)) {
    throw new ParseError('vmess payload missing add/port/id', link)
  }

  const node: VmessNode = {
    protocol: 'vmess',
    name: json.ps?.trim() || `${server}:${port}`,
    server,
    port,
    uuid,
    alterId: Number(json.aid ?? 0) || 0,
    security: json.scy || 'auto',
    udp: true,
  }

  const net = (json.net || 'tcp') as TransportType
  if (net !== 'tcp') {
    node.transport = { type: net }
    if (json.path) node.transport.path = json.path
    if (json.host) node.transport.host = json.host
    if (net === 'grpc' && json.path) node.transport.serviceName = json.path
  }

  if (json.tls === 'tls' || json.tls === '1') {
    node.tls = { enabled: true }
    const sni = json.sni || json.host
    if (sni) node.tls.serverName = sni
    if (json.alpn) node.tls.alpn = json.alpn.split(',').filter(Boolean)
    if (json.fp) node.tls.fingerprint = json.fp
  }

  return node
}
