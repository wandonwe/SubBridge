import type { ConvertOptions, ProxyNode } from '@subbridge/core'
import {
  AUTO_GROUP,
  collectSets,
  FALLBACK_GROUP,
  FINAL_GROUP,
  GROUP_ICONS,
  INTERNET_TEST_URL,
  MAIN_GROUP,
  orderedSets,
  PROXY_TEST_URL,
  type RulePreset,
  rulesForPreset,
  STRATEGY_ICONS,
  selectorGroupsForPreset,
  selectorOptions,
  surgeRuleUrl,
} from './policy'

/** Download-manager processes routed to the Download group (macOS only). */
const DOWNLOAD_PROCESSES = ['aria2c', 'Downie', 'Folx', 'Gopeed', 'Thunder', 'Transmission']

/**
 * Render a Surge 5 profile following the unified Matrix policy (see
 * `policy.ts`) — groups, rule sets and order mirror the reference
 * `Config/Matrix.surgeconfig`. Surge has no vless support — those nodes are
 * skipped (Surge rejects whole profiles containing unknown types).
 */
export function toSurge(nodes: ProxyNode[], options: ConvertOptions = {}): string {
  const supported = nodes.filter((n) => n.protocol !== 'vless')
  const lines = supported.map(surgeLine).filter((l): l is string => l !== null)
  const names = lines.map((l) => l.split('=')[0]?.trim() ?? '')
  const testUrl = options.testUrl ?? PROXY_TEST_URL
  const useRules = options.rules !== 'none'
  const preset: RulePreset =
    options.rules === 'lite' || options.rules === 'full' ? options.rules : 'default'
  const useAuto = options.urlTest !== false
  const sets = orderedSets(collectSets(supported), options.setStrategies)
  const setNames = sets.map((s) => s.name)
  const poolNames = setNames.length > 0 ? setNames : names

  const sections = [
    '#!MANAGED-CONFIG interval=86400 strict=false',
    '',
    '[General]',
    'loglevel = notify',
    `internet-test-url = ${INTERNET_TEST_URL}`,
    `proxy-test-url = ${testUrl}`,
    'test-timeout = 5',
    'dns-server = system, 223.5.5.5, 119.29.29.29',
    'encrypted-dns-server = https://dns.alidns.com/dns-query, https://doh.pub/dns-query',
    'hijack-dns = *:53',
    'exclude-simple-hostnames = true',
    'skip-proxy = 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 100.64.0.0/10, 169.254.0.0/16, 224.0.0.0/4, 240.0.0.0/4, 255.255.255.255, localhost, *.local, ::1, fc00::/7, fe80::/10, ff00::/8',
    '',
    '[Proxy]',
    ...lines,
    '',
    '[Proxy Group]',
    `${MAIN_GROUP} = select, ${useAuto ? `${AUTO_GROUP}, ${FALLBACK_GROUP}, ` : ''}${poolNames.join(', ')}, DIRECT, icon-url=${GROUP_ICONS[MAIN_GROUP]}`,
  ]
  if (useRules) {
    const download = selectorOptions(
      { name: 'Download', options: ['DIRECT', MAIN_GROUP], defaultOption: 'DIRECT' },
      setNames,
    )
    for (const g of selectorGroupsForPreset(preset)) {
      // Insert Download (macOS) between Claude and Media, as in the reference.
      if (g.name === 'Media' && preset !== 'lite') {
        sections.push(
          `Download = select, ${download.join(', ')}, icon-url=${GROUP_ICONS.Download} #!MACOS-ONLY`,
        )
      }
      sections.push(
        `${g.name} = select, ${selectorOptions(g, setNames).join(', ')}, icon-url=${GROUP_ICONS[g.name]}`,
      )
    }
  }
  // Node pools below the policy groups: AUTO, FALLBACK, then the named sets
  // ordered auto → fallback → select.
  if (useAuto) {
    sections.push(
      `${AUTO_GROUP} = url-test, ${names.join(', ')}, url=${testUrl}, interval=300, icon-url=${GROUP_ICONS[AUTO_GROUP]}`,
      `${FALLBACK_GROUP} = fallback, ${poolNames.join(', ')}, url=${testUrl}, interval=600, timeout=5, icon-url=${GROUP_ICONS[FALLBACK_GROUP]}`,
    )
  }
  for (const set of sets) {
    const icon = `icon-url=${STRATEGY_ICONS[set.strategy]}`
    if (set.strategy === 'auto') {
      sections.push(
        `${set.name} = url-test, ${set.members.join(', ')}, url=${testUrl}, interval=300, ${icon}`,
      )
    } else if (set.strategy === 'fallback') {
      sections.push(
        `${set.name} = fallback, ${set.members.join(', ')}, url=${testUrl}, interval=600, timeout=5, ${icon}`,
      )
    } else {
      sections.push(`${set.name} = select, ${set.members.join(', ')}, ${icon}`)
    }
  }

  sections.push('', '[Rule]')
  if (useRules) {
    // Download processes → Download (reference order; not in lite).
    if (preset !== 'lite') {
      for (const proc of DOWNLOAD_PROCESSES) {
        sections.push(`PROCESS-NAME,${proc},Download #!MACOS-ONLY`)
      }
    }
    // Local domains & system services → direct.
    sections.push(
      'DOMAIN-SUFFIX,home.arpa,DIRECT',
      'DOMAIN-SUFFIX,invalid,DIRECT',
      'RULE-SET,SYSTEM,DIRECT',
    )
    // Remote rule sets in reference evaluation order.
    for (const entry of rulesForPreset(preset)) {
      if (!entry.surgePath) continue
      sections.push(
        `RULE-SET,${surgeRuleUrl(entry.surgePath)},${entry.policy},update-interval=86400`,
      )
    }
    sections.push('GEOIP,CN,DIRECT', `FINAL,${FINAL_GROUP},dns-failed`, '')
  } else {
    sections.push(`FINAL,${MAIN_GROUP},dns-failed`, '')
  }
  return sections.join('\n')
}

function surgeLine(node: ProxyNode): string | null {
  const parts: string[] = []
  switch (node.protocol) {
    case 'ss': {
      parts.push(
        `${node.name} = ss`,
        `${node.server}`,
        `${node.port}`,
        `encrypt-method=${node.method}`,
        `password=${node.password}`,
      )
      if (node.plugin === 'obfs-local' || node.plugin === 'obfs') {
        const opts = Object.fromEntries(
          (node.pluginOpts ?? '').split(';').map((kv) => kv.split('=') as [string, string]),
        )
        if (opts.obfs) parts.push(`obfs=${opts.obfs}`)
        if (opts['obfs-host']) parts.push(`obfs-host=${opts['obfs-host']}`)
      }
      break
    }
    case 'vmess': {
      parts.push(`${node.name} = vmess`, `${node.server}`, `${node.port}`, `username=${node.uuid}`)
      if (node.transport?.type === 'ws') {
        parts.push('ws=true')
        if (node.transport.path) parts.push(`ws-path=${node.transport.path}`)
        if (node.transport.host) parts.push(`ws-headers=Host:"${node.transport.host}"`)
      }
      if (node.tls?.enabled) parts.push('tls=true')
      break
    }
    case 'trojan': {
      parts.push(
        `${node.name} = trojan`,
        `${node.server}`,
        `${node.port}`,
        `password=${node.password}`,
      )
      if (node.transport?.type === 'ws') {
        parts.push('ws=true')
        if (node.transport.path) parts.push(`ws-path=${node.transport.path}`)
      }
      break
    }
    case 'hysteria2': {
      parts.push(
        `${node.name} = hysteria2`,
        `${node.server}`,
        `${node.port}`,
        `password=${node.password}`,
      )
      if (node.downMbps) parts.push(`download-bandwidth=${node.downMbps}`)
      break
    }
    case 'tuic': {
      parts.push(
        `${node.name} = tuic-v5`,
        `${node.server}`,
        `${node.port}`,
        `uuid=${node.uuid}`,
        `password=${node.password}`,
      )
      if (node.tls?.alpn?.length) parts.push(`alpn=${node.tls.alpn.join(',')}`)
      break
    }
    default:
      return null
  }

  const tls = node.tls
  if (tls?.enabled) {
    if (tls.serverName) parts.push(`sni=${tls.serverName}`)
    if (tls.insecure) parts.push('skip-cert-verify=true')
  }
  if (
    node.udp &&
    (node.protocol === 'ss' || node.protocol === 'vmess' || node.protocol === 'trojan')
  ) {
    parts.push('udp-relay=true')
  }

  const [head, ...rest] = parts
  return `${head}, ${rest.join(', ')}`
}
