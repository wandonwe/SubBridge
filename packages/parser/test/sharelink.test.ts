import { describe, expect, it } from 'vitest'
import {
  parseHysteria2,
  parseShareLinks,
  parseSs,
  parseTrojan,
  parseTuic,
  parseVless,
  parseVmess,
} from '../src'

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64')

describe('ss', () => {
  it('parses SIP002 links with base64 userinfo', () => {
    const link = `ss://${b64('aes-256-gcm:secret').replace(/=+$/, '')}@1.2.3.4:8388#HK%20Node`
    const node = parseSs(link)
    expect(node).toMatchObject({
      protocol: 'ss',
      name: 'HK Node',
      server: '1.2.3.4',
      port: 8388,
      method: 'aes-256-gcm',
      password: 'secret',
    })
  })

  it('parses legacy fully-base64 links', () => {
    const link = `ss://${b64('rc4-md5:pass@5.6.7.8:443')}#Legacy`
    const node = parseSs(link)
    expect(node.server).toBe('5.6.7.8')
    expect(node.method).toBe('rc4-md5')
    expect(node.password).toBe('pass')
  })

  it('parses the plugin query parameter', () => {
    const link = `ss://${b64('aes-128-gcm:pw')}@h.example.com:443/?plugin=${encodeURIComponent(
      'obfs-local;obfs=http;obfs-host=cdn.example.com',
    )}#Obfs`
    const node = parseSs(link)
    expect(node.plugin).toBe('obfs-local')
    expect(node.pluginOpts).toBe('obfs=http;obfs-host=cdn.example.com')
  })

  it('keeps colons inside passwords', () => {
    const node = parseSs(`ss://${b64('chacha20-ietf-poly1305:a:b:c')}@x.y:1#n`)
    expect(node.password).toBe('a:b:c')
  })
})

describe('vmess', () => {
  it('parses v2rayn json payloads', () => {
    const payload = {
      v: '2',
      ps: 'JP 01',
      add: 'jp.example.com',
      port: '443',
      id: 'b831381d-6324-4d53-ad4f-8cda48b30811',
      aid: '0',
      scy: 'auto',
      net: 'ws',
      host: 'cdn.example.com',
      path: '/ray',
      tls: 'tls',
      sni: 'jp.example.com',
    }
    const node = parseVmess(`vmess://${b64(JSON.stringify(payload))}`)
    expect(node.name).toBe('JP 01')
    expect(node.uuid).toBe(payload.id)
    expect(node.transport).toMatchObject({ type: 'ws', path: '/ray', host: 'cdn.example.com' })
    expect(node.tls).toMatchObject({ enabled: true, serverName: 'jp.example.com' })
  })

  it('rejects garbage payloads', () => {
    expect(() => parseVmess('vmess://not-base64!!!')).toThrow()
  })
})

describe('vless', () => {
  it('parses reality links', () => {
    const node = parseVless(
      'vless://uuid-here@example.com:443?security=reality&pbk=PUBKEY&sid=0123&fp=chrome&type=grpc&serviceName=grpc-svc&flow=xtls-rprx-vision#US%20Reality',
    )
    expect(node.name).toBe('US Reality')
    expect(node.flow).toBe('xtls-rprx-vision')
    expect(node.tls?.reality).toEqual({ publicKey: 'PUBKEY', shortId: '0123' })
    expect(node.tls?.fingerprint).toBe('chrome')
    expect(node.transport).toMatchObject({ type: 'grpc', serviceName: 'grpc-svc' })
  })
})

describe('trojan', () => {
  it('parses with implied tls and ws transport', () => {
    const node = parseTrojan(
      'trojan://pw123@t.example.com:443?sni=t.example.com&type=ws&path=%2Fws&allowInsecure=1#TR',
    )
    expect(node.password).toBe('pw123')
    expect(node.tls).toMatchObject({ enabled: true, serverName: 't.example.com', insecure: true })
    expect(node.transport).toMatchObject({ type: 'ws', path: '/ws' })
  })
})

describe('hysteria2', () => {
  it('parses hy2 alias with obfs', () => {
    const node = parseHysteria2(
      'hy2://authpw@h2.example.com:8443?sni=h2.example.com&obfs=salamander&obfs-password=op&insecure=1#HY',
    )
    expect(node.protocol).toBe('hysteria2')
    expect(node.obfs).toBe('salamander')
    expect(node.obfsPassword).toBe('op')
    expect(node.tls?.insecure).toBe(true)
  })
})

describe('tuic', () => {
  it('parses uuid:password userinfo', () => {
    const node = parseTuic(
      'tuic://uuid-1:pass-1@tu.example.com:443?congestion_control=bbr&udp_relay_mode=native&alpn=h3#TU',
    )
    expect(node.uuid).toBe('uuid-1')
    expect(node.password).toBe('pass-1')
    expect(node.congestionControl).toBe('bbr')
    expect(node.tls?.alpn).toEqual(['h3'])
  })
})

describe('parseShareLinks', () => {
  it('skips junk lines and keeps valid ones', () => {
    const text = [
      '# comment',
      `ss://${b64('aes-256-gcm:x')}@a.example.com:443#A`,
      'not-a-link',
      'trojan://p@b.example.com:443#B',
    ].join('\n')
    const nodes = parseShareLinks(text)
    expect(nodes.map((n) => n.name)).toEqual(['A', 'B'])
  })
})
