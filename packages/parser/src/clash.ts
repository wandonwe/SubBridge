import type {
  Hysteria2Node,
  ProxyNode,
  ShadowsocksNode,
  TlsOptions,
  TransportOptions,
  TransportType,
  TrojanNode,
  TuicNode,
  VlessNode,
  VmessNode,
} from '@subbridge/core'
import { ParseError } from '@subbridge/core'
import { parse as parseYaml } from 'yaml'

type Dict = Record<string, any>

/** True when the text looks like a Clash / Mihomo YAML config. */
export function looksLikeClash(text: string): boolean {
  return /^\s*proxies\s*:/m.test(text)
}

/** Parse a Clash / Mihomo YAML config into canonical nodes. */
export function parseClash(text: string): ProxyNode[] {
  let doc: Dict
  try {
    doc = parseYaml(text, { maxAliasCount: 1000 }) as Dict
  } catch (err) {
    throw new ParseError(`invalid YAML: ${err instanceof Error ? err.message : String(err)}`)
  }
  const proxies = doc?.proxies
  if (!Array.isArray(proxies)) throw new ParseError('YAML has no `proxies` list')

  const nodes: ProxyNode[] = []
  for (const p of proxies) {
    if (typeof p !== 'object' || p === null) continue
    try {
      const node = convertProxy(p as Dict)
      if (node) nodes.push(node)
    } catch {
      // skip malformed entries, keep the rest
    }
  }
  return nodes
}

function convertProxy(p: Dict): ProxyNode | null {
  const base = {
    name: String(p.name ?? `${p.server}:${p.port}`),
    server: String(p.server ?? ''),
    port: Number(p.port ?? 0),
    ...(p.udp !== undefined ? { udp: Boolean(p.udp) } : {}),
  }
  if (!base.server || !base.port) return null

  switch (p.type) {
    case 'ss': {
      const node: ShadowsocksNode = {
        protocol: 'ss',
        ...base,
        method: String(p.cipher ?? ''),
        password: String(p.password ?? ''),
      }
      if (p.plugin) node.plugin = String(p.plugin)
      if (p['plugin-opts']) node.pluginOpts = stringifyPluginOpts(p['plugin-opts'] as Dict)
      return node
    }
    case 'vmess': {
      const node: VmessNode = {
        protocol: 'vmess',
        ...base,
        uuid: String(p.uuid ?? ''),
        alterId: Number(p.alterId ?? 0),
        security: String(p.cipher ?? 'auto'),
      }
      attachTls(node, p)
      attachTransport(node, p)
      return node
    }
    case 'vless': {
      const node: VlessNode = {
        protocol: 'vless',
        ...base,
        uuid: String(p.uuid ?? ''),
      }
      if (p.flow) node.flow = String(p.flow)
      attachTls(node, p, Boolean(p.tls))
      attachTransport(node, p)
      return node
    }
    case 'trojan': {
      const node: TrojanNode = {
        protocol: 'trojan',
        ...base,
        password: String(p.password ?? ''),
      }
      attachTls(node, p, true)
      attachTransport(node, p)
      return node
    }
    case 'hysteria2': {
      const node: Hysteria2Node = {
        protocol: 'hysteria2',
        ...base,
        password: String(p.password ?? ''),
      }
      if (p.obfs) node.obfs = String(p.obfs)
      if (p['obfs-password']) node.obfsPassword = String(p['obfs-password'])
      if (p.up) node.upMbps = Number.parseInt(String(p.up), 10) || undefined
      if (p.down) node.downMbps = Number.parseInt(String(p.down), 10) || undefined
      attachTls(node, p, true)
      return node
    }
    case 'tuic': {
      const node: TuicNode = {
        protocol: 'tuic',
        ...base,
        uuid: String(p.uuid ?? ''),
        password: String(p.password ?? ''),
      }
      if (p['congestion-controller']) node.congestionControl = String(p['congestion-controller'])
      if (p['udp-relay-mode']) node.udpRelayMode = String(p['udp-relay-mode'])
      attachTls(node, p, true)
      return node
    }
    default:
      return null
  }
}

function attachTls(node: ProxyNode, p: Dict, forced = false): void {
  const enabled = forced || Boolean(p.tls)
  if (!enabled) return
  const tls: TlsOptions = { enabled: true }
  const sni = p.servername ?? p.sni
  if (sni) tls.serverName = String(sni)
  if (Array.isArray(p.alpn)) tls.alpn = p.alpn.map(String)
  if (p['skip-cert-verify']) tls.insecure = true
  if (p['client-fingerprint']) tls.fingerprint = String(p['client-fingerprint'])
  const reality = p['reality-opts'] as Dict | undefined
  if (reality?.['public-key']) {
    tls.reality = {
      publicKey: String(reality['public-key']),
      ...(reality['short-id'] ? { shortId: String(reality['short-id']) } : {}),
    }
  }
  node.tls = tls
}

function attachTransport(node: ProxyNode, p: Dict): void {
  const network = p.network as string | undefined
  if (!network || network === 'tcp') return
  const t: TransportOptions = { type: network as TransportType }
  const wsOpts = p['ws-opts'] as Dict | undefined
  if (wsOpts) {
    if (wsOpts.path) t.path = String(wsOpts.path)
    const host = (wsOpts.headers as Dict | undefined)?.Host ?? (wsOpts.headers as Dict)?.host
    if (host) t.host = String(host)
  }
  const grpcOpts = p['grpc-opts'] as Dict | undefined
  if (grpcOpts?.['grpc-service-name']) t.serviceName = String(grpcOpts['grpc-service-name'])
  const h2Opts = p['h2-opts'] as Dict | undefined
  if (h2Opts) {
    if (h2Opts.path) t.path = String(h2Opts.path)
    if (Array.isArray(h2Opts.host) && h2Opts.host[0]) t.host = String(h2Opts.host[0])
  }
  node.transport = t
}

function stringifyPluginOpts(opts: Dict): string {
  return Object.entries(opts)
    .map(([k, v]) => (v === true ? k : `${k}=${String(v)}`))
    .join(';')
}
