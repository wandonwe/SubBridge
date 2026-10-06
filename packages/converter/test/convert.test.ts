import type { ProxyNode, Subscription } from '@subbridge/core'
import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'
import { parseShareLink } from '../../parser/src'
import { applyPipeline, convert, toShareLink } from '../src'

const nodes: ProxyNode[] = [
  {
    protocol: 'ss',
    name: 'HK 01',
    server: 'hk1.example.com',
    port: 8388,
    method: 'aes-256-gcm',
    password: 'pw',
    udp: true,
  },
  {
    protocol: 'vless',
    name: 'US Reality',
    server: 'us.example.com',
    port: 443,
    uuid: 'uuid-x',
    flow: 'xtls-rprx-vision',
    tls: {
      enabled: true,
      serverName: 'us.example.com',
      fingerprint: 'chrome',
      reality: { publicKey: 'PBK', shortId: 'ab' },
    },
  },
  {
    protocol: 'hysteria2',
    name: 'JP Hy2',
    server: 'jp.example.com',
    port: 8443,
    password: 'pw2',
    obfs: 'salamander',
    obfsPassword: 'op',
    tls: { enabled: true, serverName: 'jp.example.com' },
  },
]

const sub: Subscription = { nodes }

describe('pipeline', () => {
  it('filters with include/exclude regexes', () => {
    expect(applyPipeline(nodes, { include: '^HK' }).map((n) => n.name)).toEqual(['HK 01'])
    expect(applyPipeline(nodes, { exclude: 'Reality' })).toHaveLength(2)
  })

  it('renames and prefixes', () => {
    const out = applyPipeline(nodes, { rename: ['HK->Hong Kong'], prefix: '[SB] ' })
    expect(out[0]?.name).toBe('[SB] Hong Kong 01')
  })

  it('dedupes identical endpoints', () => {
    const first = nodes[0] as ProxyNode
    const out = applyPipeline([...nodes, { ...first, name: 'HK 01 copy' }], { dedupe: true })
    expect(out).toHaveLength(3)
  })

  it('uniquifies duplicate names', () => {
    const first = nodes[0] as ProxyNode
    const out = applyPipeline([first, { ...first, server: 'other.example.com' }])
    expect(out.map((n) => n.name)).toEqual(['HK 01', 'HK 01 2'])
  })
})

describe('mihomo output', () => {
  it('produces valid yaml with the unified Matrix policy groups', () => {
    const { content, contentType } = convert(sub, 'mihomo')
    expect(contentType).toContain('yaml')
    const doc = parseYaml(content)
    expect(doc.proxies).toHaveLength(3)
    const groupNames = doc['proxy-groups'].map((g: { name: string }) => g.name)
    expect(groupNames).toEqual([
      'Proxy',
      'Microsoft',
      'OpenAI',
      'Claude',
      'Media',
      'Guard',
      'Final',
      'AUTO',
      'FALLBACK',
    ])
    expect(doc['proxy-groups'][0]).toMatchObject({ name: 'Proxy', type: 'select' })
    const auto = doc['proxy-groups'].find((g: { name: string }) => g.name === 'AUTO')
    expect(auto).toMatchObject({ type: 'url-test', lazy: true })
    expect(doc['proxy-groups'].at(-1)).toMatchObject({ name: 'FALLBACK', type: 'fallback' })
    expect(doc.rules.at(-1)).toBe('MATCH,Final')
    expect(doc.rules).toContain('RULE-SET,claude,Claude')
    expect(doc.rules).toContain('RULE-SET,ads,Guard')
    expect(doc.rules).toContain('RULE-SET,cn,DIRECT')
    expect(doc['rule-providers'].claude.url).toContain('anthropic.mrs')
    const vless = doc.proxies.find((p: { type: string }) => p.type === 'vless')
    expect(vless['reality-opts']).toEqual({ 'public-key': 'PBK', 'short-id': 'ab' })
  })

  it('renders httpupgrade as ws + v2ray-http-upgrade and http obfs as http-opts', () => {
    const base = { protocol: 'vless', server: 'x.example.com', port: 443, uuid: 'u' } as const
    const doc = parseYaml(
      convert(
        {
          nodes: [
            {
              ...base,
              name: 'HU',
              transport: { type: 'httpupgrade', path: '/up', host: 'h.example.com' },
            },
            { ...base, name: 'HT', transport: { type: 'http', path: '/p', host: 'h.example.com' } },
          ] as ProxyNode[],
        },
        'mihomo',
      ).content,
    )
    const [hu, ht] = doc.proxies
    expect(hu.network).toBe('ws')
    expect(hu['ws-opts']).toEqual({
      path: '/up',
      headers: { Host: 'h.example.com' },
      'v2ray-http-upgrade': true,
    })
    expect(hu['httpupgrade-opts']).toBeUndefined()
    expect(ht.network).toBe('http')
    expect(ht['http-opts']).toEqual({ path: ['/p'], headers: { Host: ['h.example.com'] } })
  })

  it('omits policy groups and rules when disabled', () => {
    const doc = parseYaml(
      convert(sub, 'mihomo', { urlTest: false, fallback: false, rules: 'none' }).content,
    )
    expect(doc['proxy-groups']).toHaveLength(1)
    expect(doc.rules).toEqual(['MATCH,Proxy'])
  })

  it('AUTO and FALLBACK pools toggle independently', () => {
    const noAuto = parseYaml(convert(sub, 'mihomo', { urlTest: false }).content)
    const namesNoAuto = noAuto['proxy-groups'].map((g: { name: string }) => g.name)
    expect(namesNoAuto).not.toContain('AUTO')
    expect(namesNoAuto).toContain('FALLBACK')

    const noFallback = parseYaml(convert(sub, 'mihomo', { fallback: false }).content)
    const namesNoFb = noFallback['proxy-groups'].map((g: { name: string }) => g.name)
    expect(namesNoFb).toContain('AUTO')
    expect(namesNoFb).not.toContain('FALLBACK')
  })

  it('full preset adds detail rules, Games group and Telegram IP ranges', () => {
    const doc = parseYaml(convert(sub, 'mihomo', { rules: 'full' }).content)
    const groupNames = doc['proxy-groups'].map((g: { name: string }) => g.name)
    expect(groupNames).toContain('Games')
    expect(doc.rules).toContain('RULE-SET,gemini,OpenAI')
    expect(doc.rules).toContain('RULE-SET,disney,Media')
    expect(doc.rules).toContain('RULE-SET,games,Games')
    expect(doc.rules).toContain('RULE-SET,telegram-ip,Proxy,no-resolve')
    // Telegram IP rule sits right after the telegram domain rule.
    const idx = doc.rules.indexOf('RULE-SET,telegram,Proxy')
    expect(doc.rules[idx + 1]).toBe('RULE-SET,telegram-ip,Proxy,no-resolve')
    expect(doc['rule-providers']['telegram-ip'].behavior).toBe('ipcidr')
  })

  it('lite preset keeps only the essentials', () => {
    const doc = parseYaml(convert(sub, 'mihomo', { rules: 'lite' }).content)
    const groupNames = doc['proxy-groups'].map((g: { name: string }) => g.name)
    expect(groupNames).toEqual(['Proxy', 'Guard', 'Final', 'AUTO', 'FALLBACK'])
    const ruleSets = doc.rules.filter((r: string) => r.startsWith('RULE-SET,'))
    expect(ruleSets).toEqual([
      'RULE-SET,private,DIRECT',
      'RULE-SET,ads,Guard',
      'RULE-SET,cn,DIRECT',
      'RULE-SET,global,Proxy',
      'RULE-SET,cn-ip,DIRECT',
    ])
    expect(doc.rules).not.toContain('RULE-SET,openai,OpenAI')
  })

  it('default preset excludes the full-tier extras', () => {
    const doc = parseYaml(convert(sub, 'mihomo').content)
    expect(doc.rules).not.toContain('RULE-SET,gemini,OpenAI')
    expect(doc['proxy-groups'].map((g: { name: string }) => g.name)).not.toContain('Games')
  })
})

describe('sing-box output', () => {
  it('produces valid json with the unified Matrix policy groups', () => {
    const config = JSON.parse(convert(sub, 'singbox').content)
    const tags = config.outbounds.map((o: { tag: string }) => o.tag)
    for (const tag of ['Proxy', 'Microsoft', 'OpenAI', 'Claude', 'Media', 'Final', 'AUTO']) {
      expect(tags).toContain(tag)
    }
    expect(tags).toContain('US Reality')
    expect(config.route.final).toBe('Final')
    const ruleTags = config.route.rule_set.map((r: { tag: string }) => r.tag)
    expect(ruleTags).toContain('geosite-anthropic')
    expect(ruleTags).toContain('geoip-cn')
    // Guard is expressed via the native reject action in sing-box.
    expect(
      config.route.rules.some(
        (r: { rule_set?: string; action?: string }) =>
          r.rule_set === 'geosite-category-ads-all' && r.action === 'reject',
      ),
    ).toBe(true)
    const vless = config.outbounds.find((o: { type: string }) => o.type === 'vless')
    expect(vless.tls.reality).toMatchObject({ enabled: true, public_key: 'PBK' })
    expect(vless.tls.utls).toEqual({ enabled: true, fingerprint: 'chrome' })
  })
})

describe('surge output', () => {
  it('mirrors the Matrix reference groups and rules', () => {
    const { content } = convert(sub, 'surge')
    expect(content).toContain('HK 01 = ss')
    expect(content).toContain('JP Hy2 = hysteria2')
    expect(content).not.toContain('US Reality =')
    expect(content).toContain('Guard = select, REJECT, DIRECT, REJECT-DROP')
    expect(content).toContain('Claude = select, Proxy, DIRECT')
    expect(content).toContain('Microsoft = select, DIRECT, Proxy')
    expect(content).toContain(
      'RULE-SET,https://cdn.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Surge/Claude/Claude.list,Claude,update-interval=86400',
    )
    expect(content).toContain('PROCESS-NAME,aria2c,Download #!MACOS-ONLY')
    expect(content).toContain('FINAL,Final,dns-failed')
  })

  it('falls back to a rule-free profile when rules are disabled', () => {
    const { content } = convert(sub, 'surge', { rules: 'none' })
    expect(content).not.toContain('RULE-SET')
    expect(content).toContain('FINAL,Proxy,dns-failed')
  })
})

describe('quantumult x output', () => {
  it('renders ss and vless lines', () => {
    const { content } = convert(sub, 'quantumultx')
    expect(content).toContain('shadowsocks=hk1.example.com:8388')
    expect(content).toContain('tag=HK 01')
  })
})

describe('named node sets', () => {
  const grouped: Subscription = {
    nodes: [
      { ...(nodes[0] as ProxyNode), group: 'Prime' },
      { ...(nodes[1] as ProxyNode), group: 'Prime' },
      { ...(nodes[2] as ProxyNode), group: 'Backup' },
    ],
  }

  it('mihomo keeps each set as its own group with the agreed defaults', () => {
    const doc = parseYaml(convert(grouped, 'mihomo').content)
    const byName = Object.fromEntries(doc['proxy-groups'].map((g: { name: string }) => [g.name, g]))
    expect(byName.Prime.proxies).toEqual(['HK 01', 'US Reality'])
    expect(byName.Backup.proxies).toEqual(['JP Hy2'])
    expect(byName.Proxy.proxies).toEqual(['AUTO', 'FALLBACK', 'Prime', 'Backup', 'DIRECT'])
    expect(byName.FALLBACK).toMatchObject({ type: 'fallback', proxies: ['Prime', 'Backup'] })
    // First entry is the default selection.
    expect(byName.OpenAI.proxies[0]).toBe('Proxy')
    expect(byName.Claude.proxies[0]).toBe('Proxy')
    expect(byName.Guard.proxies[0]).toBe('REJECT')
    expect(byName.Microsoft.proxies[0]).toBe('DIRECT')
  })

  it('applies per-set strategies with matching group types, order and icons', () => {
    const doc = parseYaml(
      convert(grouped, 'mihomo', { setStrategies: { Backup: 'auto', Prime: 'fallback' } }).content,
    )
    const byName = Object.fromEntries(doc['proxy-groups'].map((g: { name: string }) => [g.name, g]))
    expect(byName.Backup).toMatchObject({ type: 'url-test', lazy: true })
    expect(byName.Backup.icon).toContain('Auto.png')
    expect(byName.Prime).toMatchObject({ type: 'fallback', lazy: true })
    expect(byName.Prime.icon).toContain('Filter.png')
    // Pools at the bottom, ordered auto → fallback → select.
    const names = doc['proxy-groups'].map((g: { name: string }) => g.name)
    expect(names.slice(-4)).toEqual(['AUTO', 'FALLBACK', 'Backup', 'Prime'])
  })

  it('sing-box renders strategy sets as urltest and includes clash_api', () => {
    const config = JSON.parse(
      convert(grouped, 'singbox', { setStrategies: { Prime: 'auto' } }).content,
    )
    const byTag = Object.fromEntries(config.outbounds.map((o: { tag: string }) => [o.tag, o]))
    expect(byTag.Prime.type).toBe('urltest')
    expect(byTag.Backup.type).toBe('selector')
    expect(config.experimental.clash_api.external_controller).toBe('127.0.0.1:9090')
  })

  it('surge renders strategy sets with url-test / fallback lines', () => {
    const { content } = convert(grouped, 'surge', {
      setStrategies: { Prime: 'auto', Backup: 'fallback' },
    })
    expect(content).toMatch(/Prime = url-test, HK 01.*interval=300/)
    expect(content).toMatch(/Backup = fallback, JP Hy2.*interval=600/)
    expect(content).toContain('FALLBACK = fallback, Prime, Backup')
  })

  it('sing-box mirrors the sets with explicit defaults', () => {
    const config = JSON.parse(convert(grouped, 'singbox').content)
    const byTag = Object.fromEntries(config.outbounds.map((o: { tag: string }) => [o.tag, o]))
    expect(byTag.Prime.outbounds).toEqual(['HK 01', 'US Reality'])
    expect(byTag.Proxy.outbounds).toEqual(['AUTO', 'Prime', 'Backup', 'direct'])
    expect(byTag.OpenAI.default).toBe('Proxy')
    expect(byTag.Claude.default).toBe('Proxy')
  })

  it('surge lists sets in groups and policy options', () => {
    const { content } = convert(grouped, 'surge')
    expect(content).toContain('Prime = select, HK 01')
    expect(content).toContain('Backup = select, JP Hy2')
    expect(content).toMatch(/Proxy = select, AUTO, FALLBACK, Prime, Backup, DIRECT/)
    expect(content).toContain('OpenAI = select, Proxy, DIRECT, Prime, Backup')
  })

  it('pools nodes as before when no sets are named', () => {
    const doc = parseYaml(convert(sub, 'mihomo').content)
    const proxy = doc['proxy-groups'].find((g: { name: string }) => g.name === 'Proxy')
    expect(proxy.proxies).toEqual(['AUTO', 'FALLBACK', 'HK 01', 'US Reality', 'JP Hy2', 'DIRECT'])
    const openai = doc['proxy-groups'].find((g: { name: string }) => g.name === 'OpenAI')
    // Without a Backup set, OpenAI falls back to Proxy as default.
    expect(openai.proxies[0]).toBe('Proxy')
  })
})

describe('share link round-trip', () => {
  it.each(nodes.map((n) => [n.name, n] as const))('%s survives a round-trip', (_name, node) => {
    const reparsed = parseShareLink(toShareLink(node))
    expect(reparsed.protocol).toBe(node.protocol)
    expect(reparsed.server).toBe(node.server)
    expect(reparsed.port).toBe(node.port)
    expect(reparsed.name).toBe(node.name)
    if ('uuid' in node && 'uuid' in reparsed) expect(reparsed.uuid).toBe(node.uuid)
    if ('password' in node && 'password' in reparsed) expect(reparsed.password).toBe(node.password)
  })

  it('base64 output decodes back to share links', () => {
    const { content } = convert(sub, 'base64')
    const decoded = Buffer.from(content, 'base64').toString('utf8')
    expect(decoded.split('\n').filter(Boolean)).toHaveLength(3)
  })
})

describe('client compatibility fixes', () => {
  const ssObfsLink: ProxyNode = {
    protocol: 'ss',
    name: 'SS obfs, link',
    server: 'a.example.com',
    port: 80,
    method: 'aes-128-gcm',
    password: 'pw',
    plugin: 'obfs-local',
    pluginOpts: 'obfs=http;obfs-host=bing.com',
  }
  const ssObfsClash: ProxyNode = {
    ...ssObfsLink,
    name: 'SS obfs clash',
    plugin: 'obfs',
    pluginOpts: 'mode=tls;host=bing.com',
  }
  const vmess0: ProxyNode = {
    protocol: 'vmess',
    name: 'VM',
    server: 'v.example.com',
    port: 443,
    uuid: 'u',
    alterId: 0,
    security: 'auto',
    tls: { enabled: true, serverName: 'v.example.com' },
    transport: { type: 'ws', path: '/ws', host: 'v.example.com' },
  }
  const vmessGrpc: ProxyNode = {
    ...vmess0,
    name: 'VM grpc',
    transport: { type: 'grpc', serviceName: 'g' },
  }
  const realityNoFp: ProxyNode = {
    protocol: 'vless',
    name: 'R',
    server: 'r.example.com',
    port: 443,
    uuid: 'u',
    flow: 'xtls-rprx-vision',
    tls: {
      enabled: true,
      serverName: 'www.apple.com',
      reality: { publicKey: 'PBK', shortId: 'ab' },
    },
  }
  const hy2: ProxyNode = {
    protocol: 'hysteria2',
    name: 'H',
    server: 'h.example.com',
    port: 443,
    password: 'p',
    obfs: 'salamander',
    obfsPassword: 'op',
  }

  it('mihomo normalises both ss obfs dialects and defaults REALITY fingerprint', () => {
    const doc = parseYaml(
      convert({ nodes: [ssObfsLink, ssObfsClash, realityNoFp] }, 'mihomo').content,
    )
    expect(doc.proxies[0]).toMatchObject({
      plugin: 'obfs',
      'plugin-opts': { mode: 'http', host: 'bing.com' },
    })
    expect(doc.proxies[1]).toMatchObject({
      plugin: 'obfs',
      'plugin-opts': { mode: 'tls', host: 'bing.com' },
    })
    expect(doc.proxies[2]['client-fingerprint']).toBe('chrome')
    expect(doc.dns['default-nameserver']).toBeDefined()
    expect(doc.rules).not.toContain('GEOIP,CN,DIRECT')
  })

  it('sing-box uses SIP003 plugin opts, uTLS for REALITY and a bootstrap resolver', () => {
    const doc = JSON.parse(convert({ nodes: [ssObfsClash, realityNoFp] }, 'singbox').content)
    const ss = doc.outbounds.find((o: { tag: string }) => o.tag === 'SS obfs clash')
    expect(ss).toMatchObject({ plugin: 'obfs-local', plugin_opts: 'obfs=tls;obfs-host=bing.com' })
    const r = doc.outbounds.find((o: { tag: string }) => o.tag === 'R')
    expect(r.tls.utls).toEqual({ enabled: true, fingerprint: 'chrome' })
    expect(doc.route.default_domain_resolver).toBe('bootstrap')
    expect(doc.dns.servers.find((s: { tag: string }) => s.tag === 'bootstrap')).toBeDefined()
  })

  it('surge: AEAD vmess, salamander, skips unsupported nodes, sanitises names', () => {
    const { content } = convert(
      { nodes: [ssObfsLink, vmess0, vmessGrpc, realityNoFp, hy2] },
      'surge',
      { profileUrl: 'https://api.example.com/api/convert?x=1' },
    )
    expect(content.startsWith('#!MANAGED-CONFIG https://api.example.com/api/convert?x=1 ')).toBe(
      true,
    )
    expect(content).toContain('SS obfs link = ss, a.example.com, 80')
    expect(content).toContain('obfs=http, obfs-host=bing.com')
    expect(content).toMatch(/VM = vmess, .*vmess-aead=true.*ws-headers=Host:v\.example\.com/)
    expect(content).toContain('salamander-password=op')
    expect(content).not.toContain('VM grpc')
    expect(content).not.toMatch(/^R = /m)
  })

  it('quantumult x: REALITY params, obfs from clash dialect, skips gRPC', () => {
    const content = convert(
      { nodes: [ssObfsClash, vmess0, vmessGrpc, realityNoFp, hy2] },
      'quantumultx',
    ).content
    const lines = content.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('obfs=tls, obfs-host=bing.com')
    expect(lines[1]).not.toContain('aead=false')
    expect(lines[2]).toContain('obfs=over-tls, obfs-host=www.apple.com')
    expect(lines[2]).toContain('reality-base64-pubkey=PBK, reality-hex-shortid=ab')
    expect(lines[2]).toContain('vless-flow=xtls-rprx-vision')
  })

  it('tuic share link keeps the uuid:password separator literal', () => {
    const link = toShareLink({
      protocol: 'tuic',
      name: 'T',
      server: 't.example.com',
      port: 443,
      uuid: 'uu-id',
      password: 'p@ss',
    })
    expect(link.startsWith('tuic://uu-id:p%40ss@t.example.com:443')).toBe(true)
  })
})
