import type { ConvertOptions, ProxyNode } from '@subbridge/core'
import {
  AUTO_GROUP,
  FINAL_GROUP,
  MAIN_GROUP,
  PROXY_TEST_URL,
  RULES,
  SELECTOR_GROUPS,
} from './policy'

type Dict = Record<string, any>

/**
 * Render a complete sing-box (1.10+) JSON configuration following the
 * unified Matrix policy (see `policy.ts`). Rule sources are MetaCubeX srs
 * rule sets — the sing-box equivalents of the reference blackmatrix7 lists.
 *
 * One deliberate divergence: sing-box has no REJECT policy inside selector
 * groups, so the Guard rules use the native `reject` route action instead
 * of a switchable group.
 */
export function toSingbox(nodes: ProxyNode[], options: ConvertOptions = {}): string {
  const outbounds = nodes.map(toSingboxOutbound)
  const names = nodes.map((n) => n.name)
  const useRules = options.rules !== 'none'

  const selector: Dict = {
    type: 'selector',
    tag: MAIN_GROUP,
    outbounds: [...(options.urlTest !== false ? [AUTO_GROUP] : []), ...names, 'direct'],
    default: options.urlTest !== false ? AUTO_GROUP : names[0],
  }
  const groupOutbounds: Dict[] = [selector]
  if (useRules) {
    for (const g of SELECTOR_GROUPS) {
      if (g.name === 'Guard') continue // handled via the `reject` route action
      groupOutbounds.push({
        type: 'selector',
        tag: g.name,
        outbounds: g.options.map((o) => (o === 'DIRECT' ? 'direct' : o)),
        default: 'direct',
      })
    }
  }
  if (options.urlTest !== false) {
    groupOutbounds.push({
      type: 'urltest',
      tag: AUTO_GROUP,
      outbounds: names,
      url: options.testUrl ?? PROXY_TEST_URL,
      interval: '5m',
      tolerance: 50,
    })
  }

  const routeRules: Dict[] = [
    { action: 'sniff' },
    { protocol: 'dns', action: 'hijack-dns' },
    { ip_is_private: true, outbound: 'direct' },
  ]
  const ruleSets: Dict[] = []
  if (useRules) {
    ruleSets.push(geositeRuleSet('private'))
    routeRules.push({ rule_set: 'geosite-private', outbound: 'direct' })
    for (const entry of RULES) {
      if (!entry.geosite) continue // Surge-only list without a geosite twin
      ruleSets.push(geositeRuleSet(entry.geosite))
      const tag = `geosite-${entry.geosite}`
      if (entry.policy === 'Guard') {
        routeRules.push({ rule_set: tag, action: 'reject' })
      } else if (entry.policy === 'DIRECT') {
        routeRules.push({ rule_set: tag, outbound: 'direct' })
      } else {
        routeRules.push({ rule_set: tag, outbound: entry.policy })
      }
    }
    ruleSets.push(geoipRuleSet('cn'))
    routeRules.push({ rule_set: 'geoip-cn', outbound: 'direct' })
  }

  const config: Dict = {
    log: { level: 'info', timestamp: true },
    dns: {
      servers: [
        { tag: 'remote', type: 'https', server: 'dns.alidns.com' },
        { tag: 'local', type: 'https', server: 'doh.pub' },
      ],
      final: 'remote',
    },
    inbounds: [
      {
        type: 'tun',
        tag: 'tun-in',
        address: ['172.19.0.1/30'],
        auto_route: true,
        strict_route: true,
      },
      { type: 'mixed', tag: 'mixed-in', listen: '127.0.0.1', listen_port: 7890 },
    ],
    outbounds: [...groupOutbounds, ...outbounds, { type: 'direct', tag: 'direct' }],
    route: {
      final: useRules ? FINAL_GROUP : MAIN_GROUP,
      auto_detect_interface: true,
      rules: routeRules,
      ...(ruleSets.length > 0 ? { rule_set: ruleSets } : {}),
    },
    experimental: {
      cache_file: { enabled: true },
    },
  }

  return JSON.stringify(config, null, 2)
}

const META_RULES = 'https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo'

function geositeRuleSet(name: string): Dict {
  return {
    tag: `geosite-${name}`,
    type: 'remote',
    format: 'binary',
    url: `${META_RULES}/geosite/${name}.srs`,
    download_detour: 'direct',
  }
}

function geoipRuleSet(name: string): Dict {
  return {
    tag: `geoip-${name}`,
    type: 'remote',
    format: 'binary',
    url: `${META_RULES}/geoip/${name}.srs`,
    download_detour: 'direct',
  }
}

/** Render one canonical node as a sing-box outbound. */
export function toSingboxOutbound(node: ProxyNode): Dict {
  const base: Dict = {
    tag: node.name,
    server: node.server,
    server_port: node.port,
  }

  switch (node.protocol) {
    case 'ss': {
      const o: Dict = {
        type: 'shadowsocks',
        ...base,
        method: node.method,
        password: node.password,
      }
      if (node.plugin) {
        o.plugin = node.plugin === 'obfs-local' ? 'obfs-local' : node.plugin
        if (node.pluginOpts) o.plugin_opts = node.pluginOpts
      }
      return o
    }
    case 'vmess': {
      const o: Dict = {
        type: 'vmess',
        ...base,
        uuid: node.uuid,
        security: node.security || 'auto',
        alter_id: node.alterId,
      }
      applyTls(o, node)
      applyTransport(o, node)
      return o
    }
    case 'vless': {
      const o: Dict = { type: 'vless', ...base, uuid: node.uuid }
      if (node.flow) o.flow = node.flow
      applyTls(o, node)
      applyTransport(o, node)
      return o
    }
    case 'trojan': {
      const o: Dict = { type: 'trojan', ...base, password: node.password }
      applyTls(o, node, true)
      applyTransport(o, node)
      return o
    }
    case 'hysteria2': {
      const o: Dict = { type: 'hysteria2', ...base, password: node.password }
      if (node.obfs) {
        o.obfs = { type: node.obfs, ...(node.obfsPassword ? { password: node.obfsPassword } : {}) }
      }
      if (node.upMbps) o.up_mbps = node.upMbps
      if (node.downMbps) o.down_mbps = node.downMbps
      applyTls(o, node, true)
      return o
    }
    case 'tuic': {
      const o: Dict = {
        type: 'tuic',
        ...base,
        uuid: node.uuid,
        password: node.password,
      }
      if (node.congestionControl) o.congestion_control = node.congestionControl
      if (node.udpRelayMode) o.udp_relay_mode = node.udpRelayMode
      applyTls(o, node, true)
      return o
    }
  }
}

function applyTls(o: Dict, node: ProxyNode, implied = false): void {
  const tls = node.tls
  if (!tls?.enabled) {
    if (implied) o.tls = { enabled: true }
    return
  }
  const t: Dict = { enabled: true }
  if (tls.serverName) t.server_name = tls.serverName
  if (tls.alpn?.length) t.alpn = tls.alpn
  if (tls.insecure) t.insecure = true
  if (tls.fingerprint) t.utls = { enabled: true, fingerprint: tls.fingerprint }
  if (tls.reality) {
    t.reality = {
      enabled: true,
      public_key: tls.reality.publicKey,
      ...(tls.reality.shortId ? { short_id: tls.reality.shortId } : {}),
    }
  }
  o.tls = t
}

function applyTransport(o: Dict, node: ProxyNode): void {
  const t = node.transport
  if (!t || t.type === 'tcp') return
  if (t.type === 'ws') {
    const transport: Dict = { type: 'ws' }
    if (t.path) transport.path = t.path
    if (t.host) transport.headers = { Host: t.host }
    o.transport = transport
  } else if (t.type === 'grpc') {
    o.transport = { type: 'grpc', service_name: t.serviceName ?? t.path ?? '' }
  } else if (t.type === 'http' || t.type === 'h2') {
    const transport: Dict = { type: 'http' }
    if (t.path) transport.path = t.path
    if (t.host) transport.host = [t.host]
    o.transport = transport
  } else if (t.type === 'httpupgrade') {
    const transport: Dict = { type: 'httpupgrade' }
    if (t.path) transport.path = t.path
    if (t.host) transport.host = t.host
    o.transport = transport
  }
}
