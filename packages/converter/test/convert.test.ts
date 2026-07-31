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
    ])
    expect(doc['proxy-groups'][0]).toMatchObject({ name: 'Proxy', type: 'select' })
    expect(doc['proxy-groups'].at(-1)).toMatchObject({ name: 'AUTO', type: 'url-test' })
    expect(doc.rules.at(-1)).toBe('MATCH,Final')
    expect(doc.rules).toContain('RULE-SET,claude,Claude')
    expect(doc.rules).toContain('RULE-SET,ads,Guard')
    expect(doc.rules).toContain('RULE-SET,cn,DIRECT')
    expect(doc['rule-providers'].claude.url).toContain('anthropic.mrs')
    const vless = doc.proxies.find((p: { type: string }) => p.type === 'vless')
    expect(vless['reality-opts']).toEqual({ 'public-key': 'PBK', 'short-id': 'ab' })
  })

  it('omits policy groups and rules when disabled', () => {
    const doc = parseYaml(convert(sub, 'mihomo', { urlTest: false, rules: 'none' }).content)
    expect(doc['proxy-groups']).toHaveLength(1)
    expect(doc.rules).toEqual(['MATCH,Proxy'])
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

  it('mihomo keeps each set as its own group and defaults OpenAI to Backup', () => {
    const doc = parseYaml(convert(grouped, 'mihomo').content)
    const byName = Object.fromEntries(doc['proxy-groups'].map((g: { name: string }) => [g.name, g]))
    expect(byName.Prime.proxies).toEqual(['HK 01', 'US Reality'])
    expect(byName.Backup.proxies).toEqual(['JP Hy2'])
    expect(byName.Proxy.proxies).toEqual(['AUTO', 'Prime', 'Backup', 'DIRECT'])
    // Screenshot defaults: first entry is the default selection.
    expect(byName.OpenAI.proxies[0]).toBe('Backup')
    expect(byName.Claude.proxies[0]).toBe('Proxy')
    expect(byName.Guard.proxies[0]).toBe('REJECT')
    expect(byName.Microsoft.proxies[0]).toBe('DIRECT')
  })

  it('sing-box mirrors the sets with explicit defaults', () => {
    const config = JSON.parse(convert(grouped, 'singbox').content)
    const byTag = Object.fromEntries(config.outbounds.map((o: { tag: string }) => [o.tag, o]))
    expect(byTag.Prime.outbounds).toEqual(['HK 01', 'US Reality'])
    expect(byTag.Proxy.outbounds).toEqual(['AUTO', 'Prime', 'Backup', 'direct'])
    expect(byTag.OpenAI.default).toBe('Backup')
    expect(byTag.Claude.default).toBe('Proxy')
  })

  it('surge lists sets in groups and policy options', () => {
    const { content } = convert(grouped, 'surge')
    expect(content).toContain('Prime = select, HK 01')
    expect(content).toContain('Backup = select, JP Hy2')
    expect(content).toMatch(/Proxy = select, AUTO, Prime, Backup, DIRECT/)
    expect(content).toContain('OpenAI = select, Backup, DIRECT, Proxy, Prime')
  })

  it('pools nodes as before when no sets are named', () => {
    const doc = parseYaml(convert(sub, 'mihomo').content)
    const proxy = doc['proxy-groups'].find((g: { name: string }) => g.name === 'Proxy')
    expect(proxy.proxies).toEqual(['AUTO', 'HK 01', 'US Reality', 'JP Hy2', 'DIRECT'])
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
