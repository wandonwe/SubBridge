import type { ConvertOptions, ProxyNode } from '@subbridge/core'
import { normalizeSsPlugin, safeLineName } from './plugin'

/**
 * Render a Quantumult X server snippet (`[server_local]` style lines), for
 * use as a `[server_remote]` resource. Supported: shadowsocks (obfs / ws),
 * vmess, vless (TLS / ws / REALITY, 1.5.5+), trojan. Anything QX can't carry
 * — hysteria2, tuic, gRPC/H2/HTTPUpgrade transports — is skipped rather than
 * emitted as a dead plain-TCP entry.
 */
export function toQuantumultX(nodes: ProxyNode[], _options: ConvertOptions = {}): string {
  return nodes
    .map(qxLine)
    .filter((l): l is string => l !== null)
    .join('\n')
}

function qxLine(node: ProxyNode): string | null {
  const t = node.transport?.type ?? 'tcp'
  if (t !== 'tcp' && t !== 'ws') return null

  const parts: string[] = []
  switch (node.protocol) {
    case 'ss': {
      if (t !== 'tcp') return null
      parts.push(`shadowsocks=${node.server}:${node.port}`)
      parts.push(`method=${node.method}`, `password=${node.password}`)
      const plugin = normalizeSsPlugin(node)
      if (plugin?.kind === 'obfs') {
        parts.push(`obfs=${plugin.mode}`)
        if (plugin.host) parts.push(`obfs-host=${plugin.host}`)
      } else if (plugin?.kind === 'v2ray') {
        parts.push(plugin.tls ? 'obfs=wss' : 'obfs=ws')
        if (plugin.host) parts.push(`obfs-host=${plugin.host}`)
        if (plugin.path) parts.push(`obfs-uri=${plugin.path}`)
      } else if (plugin) {
        return null
      }
      break
    }
    case 'vmess': {
      if (node.tls?.reality) return null
      parts.push(`vmess=${node.server}:${node.port}`)
      parts.push(`method=${vmessCipher(node.security)}`, `password=${node.uuid}`)
      applyObfs(parts, node)
      // QX uses the AEAD header by default; legacy alterId>0 servers need it off.
      if (node.alterId > 0) parts.push('aead=false')
      break
    }
    case 'vless': {
      parts.push(`vless=${node.server}:${node.port}`)
      parts.push('method=none', `password=${node.uuid}`)
      applyObfs(parts, node)
      const reality = node.tls?.reality
      if (reality) {
        parts.push(`reality-base64-pubkey=${reality.publicKey}`)
        if (reality.shortId) parts.push(`reality-hex-shortid=${reality.shortId}`)
      }
      if (node.flow) parts.push(`vless-flow=${node.flow}`)
      break
    }
    case 'trojan': {
      parts.push(`trojan=${node.server}:${node.port}`)
      parts.push(`password=${node.password}`)
      if (t === 'ws') {
        parts.push(node.tls?.enabled === false ? 'obfs=ws' : 'obfs=wss')
        if (node.transport?.path) parts.push(`obfs-uri=${node.transport.path}`)
        const h = node.transport?.host ?? node.tls?.serverName
        if (h) parts.push(`obfs-host=${h}`)
      } else {
        parts.push('over-tls=true')
        if (node.tls?.serverName) parts.push(`tls-host=${node.tls.serverName}`)
      }
      if (node.tls?.insecure) parts.push('tls-verification=false')
      break
    }
    default:
      return null
  }

  if (node.udp) parts.push('udp-relay=true')
  parts.push('fast-open=false', `tag=${safeLineName(node.name)}`)
  return parts.join(', ')
}

function vmessCipher(security: string): string {
  if (security === 'chacha20-ietf-poly1305') return 'chacha20-poly1305'
  const allowed = ['aes-128-gcm', 'chacha20-poly1305', 'none']
  return allowed.includes(security) ? security : 'aes-128-gcm'
}

/** vmess / vless: ws, wss or plain TLS via QX's `obfs` key. */
function applyObfs(parts: string[], node: ProxyNode): void {
  const isWs = node.transport?.type === 'ws'
  const isTls = Boolean(node.tls?.enabled)
  if (isWs) {
    parts.push(isTls ? 'obfs=wss' : 'obfs=ws')
    if (node.transport?.path) parts.push(`obfs-uri=${node.transport.path}`)
    const h = node.transport?.host ?? node.tls?.serverName
    if (h) parts.push(`obfs-host=${h}`)
  } else if (isTls) {
    parts.push('obfs=over-tls')
    if (node.tls?.serverName) parts.push(`obfs-host=${node.tls.serverName}`)
  }
  if (node.tls?.insecure) parts.push('tls-verification=false')
}
