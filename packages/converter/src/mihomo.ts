import type { ConvertOptions, ProxyNode } from '@subbridge/core'
import { stringify as stringifyYaml } from 'yaml'
import {
  AUTO_GROUP,
  FINAL_GROUP,
  GROUP_ICONS,
  MAIN_GROUP,
  PROXY_TEST_URL,
  RULES,
  SELECTOR_GROUPS,
} from './policy'

type Dict = Record<string, any>

/**
 * Render a complete Mihomo (Clash Meta) YAML configuration following the
 * unified Matrix policy (see `policy.ts`). Rule sources are MetaCubeX
 * geosite mrs providers — the Mihomo-native equivalents of the blackmatrix7
 * lists the reference Surge config uses.
 */
export function toMihomo(nodes: ProxyNode[], options: ConvertOptions = {}): string {
  const names = nodes.map((n) => n.name)
  const testUrl = options.testUrl ?? PROXY_TEST_URL
  const useRules = options.rules !== 'none'

  const groups: Dict[] = [
    {
      name: MAIN_GROUP,
      type: 'select',
      proxies: [...(options.urlTest !== false ? [AUTO_GROUP] : []), ...names, 'DIRECT'],
      icon: GROUP_ICONS[MAIN_GROUP],
    },
  ]
  if (useRules) {
    for (const g of SELECTOR_GROUPS) {
      groups.push({ name: g.name, type: 'select', proxies: g.options, icon: GROUP_ICONS[g.name] })
    }
  }
  if (options.urlTest !== false) {
    groups.push({
      name: AUTO_GROUP,
      type: 'url-test',
      url: testUrl,
      interval: 300,
      tolerance: 50,
      proxies: names,
      icon: GROUP_ICONS[AUTO_GROUP],
    })
  }

  const config: Dict = {
    'mixed-port': 7890,
    'allow-lan': false,
    mode: 'rule',
    'log-level': 'info',
    'unified-delay': true,
    'tcp-concurrent': true,
    dns: {
      enable: true,
      'prefer-h3': true,
      'enhanced-mode': 'fake-ip',
      'fake-ip-range': '198.18.0.1/16',
      nameserver: ['https://dns.alidns.com/dns-query', 'https://doh.pub/dns-query'],
    },
    proxies: nodes.map(toMihomoProxy),
    'proxy-groups': groups,
  }

  if (useRules) {
    const providers: Dict = { private: ruleProvider('private') }
    const rules: string[] = [
      // Local domains & system services: direct (reference order).
      'DOMAIN-SUFFIX,home.arpa,DIRECT',
      'DOMAIN-SUFFIX,invalid,DIRECT',
      'RULE-SET,private,DIRECT',
    ]
    for (const entry of RULES) {
      if (!entry.geosite) continue // Surge-only list (e.g. Hijacking) without a geosite twin
      providers[entry.key] = ruleProvider(entry.geosite)
      rules.push(`RULE-SET,${entry.key},${entry.policy}`)
    }
    rules.push('GEOIP,LAN,DIRECT', 'GEOIP,CN,DIRECT', `MATCH,${FINAL_GROUP}`)
    config['rule-providers'] = providers
    config.rules = rules
  } else {
    config.rules = [`MATCH,${MAIN_GROUP}`]
  }

  return stringifyYaml(config, { lineWidth: 0 })
}

function ruleProvider(geosite: string): Dict {
  return {
    type: 'http',
    behavior: 'domain',
    format: 'mrs',
    url: `https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/${geosite}.mrs`,
    path: `./rule-providers/${geosite}.mrs`,
    interval: 86400,
  }
}

/** Render one canonical node as a Mihomo proxy entry. */
export function toMihomoProxy(node: ProxyNode): Dict {
  const base: Dict = {
    name: node.name,
    server: node.server,
    port: node.port,
  }
  if (node.udp !== undefined) base.udp = node.udp

  switch (node.protocol) {
    case 'ss': {
      const p: Dict = { ...base, type: 'ss', cipher: node.method, password: node.password }
      if (node.plugin) {
        p.plugin = node.plugin
        if (node.pluginOpts) p['plugin-opts'] = parsePluginOpts(node.pluginOpts)
      }
      return p
    }
    case 'vmess': {
      const p: Dict = {
        ...base,
        type: 'vmess',
        uuid: node.uuid,
        alterId: node.alterId,
        cipher: node.security || 'auto',
      }
      applyTls(p, node)
      applyTransport(p, node)
      return p
    }
    case 'vless': {
      const p: Dict = { ...base, type: 'vless', uuid: node.uuid }
      if (node.flow) p.flow = node.flow
      applyTls(p, node)
      applyTransport(p, node)
      return p
    }
    case 'trojan': {
      const p: Dict = { ...base, type: 'trojan', password: node.password }
      applyTls(p, node, /* implied */ true)
      applyTransport(p, node)
      return p
    }
    case 'hysteria2': {
      const p: Dict = { ...base, type: 'hysteria2', password: node.password }
      if (node.obfs) p.obfs = node.obfs
      if (node.obfsPassword) p['obfs-password'] = node.obfsPassword
      if (node.upMbps) p.up = `${node.upMbps} Mbps`
      if (node.downMbps) p.down = `${node.downMbps} Mbps`
      applyTls(p, node, true)
      return p
    }
    case 'tuic': {
      const p: Dict = { ...base, type: 'tuic', uuid: node.uuid, password: node.password }
      if (node.congestionControl) p['congestion-controller'] = node.congestionControl
      if (node.udpRelayMode) p['udp-relay-mode'] = node.udpRelayMode
      applyTls(p, node, true)
      return p
    }
  }
}

function applyTls(p: Dict, node: ProxyNode, implied = false): void {
  const tls = node.tls
  if (!tls?.enabled) return
  if (!implied) p.tls = true
  if (tls.serverName) {
    if (node.protocol === 'vmess' || node.protocol === 'vless') p.servername = tls.serverName
    else p.sni = tls.serverName
  }
  if (tls.alpn?.length) p.alpn = tls.alpn
  if (tls.insecure) p['skip-cert-verify'] = true
  if (tls.fingerprint) p['client-fingerprint'] = tls.fingerprint
  if (tls.reality) {
    p['reality-opts'] = {
      'public-key': tls.reality.publicKey,
      ...(tls.reality.shortId ? { 'short-id': tls.reality.shortId } : {}),
    }
  }
}

function applyTransport(p: Dict, node: ProxyNode): void {
  const t = node.transport
  if (!t || t.type === 'tcp') return
  p.network = t.type === 'h2' ? 'h2' : t.type
  if (t.type === 'ws' || t.type === 'httpupgrade') {
    const opts: Dict = {}
    if (t.path) opts.path = t.path
    if (t.host) opts.headers = { Host: t.host }
    p[`${t.type}-opts`] = opts
  } else if (t.type === 'grpc') {
    p['grpc-opts'] = { 'grpc-service-name': t.serviceName ?? t.path ?? '' }
  } else if (t.type === 'h2' || t.type === 'http') {
    const opts: Dict = {}
    if (t.path) opts.path = t.path
    if (t.host) opts.host = [t.host]
    p['h2-opts'] = opts
  }
}

function parsePluginOpts(opts: string): Dict {
  const out: Dict = {}
  for (const part of opts.split(';')) {
    if (!part) continue
    const eq = part.indexOf('=')
    if (eq === -1) out[part] = true
    else out[part.slice(0, eq)] = part.slice(eq + 1)
  }
  return out
}
