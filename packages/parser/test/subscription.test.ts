import { describe, expect, it } from 'vitest'
import { mergeSubscriptions, parseSubscription, parseUserInfoHeader } from '../src'

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64')

const CLASH_YAML = `
proxies:
  - name: "SS Node"
    type: ss
    server: 1.2.3.4
    port: 8388
    cipher: aes-256-gcm
    password: secret
    udp: true
  - name: "Vless Reality"
    type: vless
    server: r.example.com
    port: 443
    uuid: uuid-x
    tls: true
    servername: r.example.com
    flow: xtls-rprx-vision
    client-fingerprint: chrome
    reality-opts:
      public-key: PBK
      short-id: ab12
  - name: "Hy2"
    type: hysteria2
    server: h.example.com
    port: 8443
    password: pw
    sni: h.example.com
`

describe('parseSubscription', () => {
  it('detects clash yaml', () => {
    const sub = parseSubscription(CLASH_YAML)
    expect(sub.nodes).toHaveLength(3)
    const vless = sub.nodes[1]
    expect(vless).toMatchObject({ protocol: 'vless', uuid: 'uuid-x' })
    if (vless?.protocol === 'vless') {
      expect(vless.tls?.reality).toEqual({ publicKey: 'PBK', shortId: 'ab12' })
    }
  })

  it('detects plain share-link lists', () => {
    const sub = parseSubscription('trojan://p@a.example.com:443#A')
    expect(sub.nodes).toHaveLength(1)
  })

  it('detects base64-wrapped share-link lists', () => {
    const sub = parseSubscription(b64('trojan://p@a.example.com:443#A\n'))
    expect(sub.nodes[0]?.name).toBe('A')
  })

  it('throws on unrecognised input', () => {
    expect(() => parseSubscription('hello world, definitely not a subscription')).toThrow()
  })
})

describe('parseUserInfoHeader', () => {
  it('parses the standard header', () => {
    const info = parseUserInfoHeader(
      'upload=100; download=2048; total=10737418240; expire=1735689600',
    )
    expect(info).toEqual({ upload: 100, download: 2048, total: 10737418240, expire: 1735689600 })
  })

  it('returns undefined for empty headers', () => {
    expect(parseUserInfoHeader(null)).toBeUndefined()
    expect(parseUserInfoHeader('')).toBeUndefined()
  })
})

describe('mergeSubscriptions', () => {
  it('concatenates nodes in order', () => {
    const a = parseSubscription('trojan://p@a.example.com:443#A')
    const b = parseSubscription('trojan://p@b.example.com:443#B')
    expect(mergeSubscriptions([a, b]).nodes.map((n) => n.name)).toEqual(['A', 'B'])
  })
})
