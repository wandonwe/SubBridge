import type { ConvertOptions, ProxyNode } from '@subbridge/core'

/**
 * Render a Quantumult X server snippet (`[server_local]` style lines).
 * QX supports shadowsocks, vmess, trojan and vless(tls) — others are skipped.
 */
export function toQuantumultX(nodes: ProxyNode[], _options: ConvertOptions = {}): string {
  return nodes
    .map(qxLine)
    .filter((l): l is string => l !== null)
    .join('\n')
}

function qxLine(node: ProxyNode): string | null {
  const parts: string[] = []
  switch (node.protocol) {
    case 'ss': {
      parts.push(`shadowsocks=${node.server}:${node.port}`)
      parts.push(`method=${node.method}`, `password=${node.password}`)
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
      parts.push(`vmess=${node.server}:${node.port}`)
      parts.push(`method=${vmessCipher(node.security)}`, `password=${node.uuid}`)
      applyObfs(parts, node)
      break
    }
    case 'vless': {
      // QX supports vless over tls/ws since v1.4 via the vless tag.
      parts.push(`vless=${node.server}:${node.port}`)
      parts.push('method=none', `password=${node.uuid}`)
      applyObfs(parts, node)
      break
    }
    case 'trojan': {
      parts.push(`trojan=${node.server}:${node.port}`)
      parts.push(`password=${node.password}`)
      if (node.transport?.type === 'ws') {
        parts.push(node.tls?.enabled ? 'obfs=wss' : 'obfs=ws')
        if (node.transport.path) parts.push(`obfs-uri=${node.transport.path}`)
        const host = node.transport.host ?? node.tls?.serverName
        if (host) parts.push(`obfs-host=${host}`)
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
  parts.push('fast-open=false', `tag=${node.name}`)
  return parts.join(', ')
}

function vmessCipher(security: string): string {
  const allowed = ['aes-128-gcm', 'chacha20-poly1305', 'none']
  return allowed.includes(security) ? security : 'aes-128-gcm'
}

function applyObfs(parts: string[], node: ProxyNode): void {
  const isWs = node.transport?.type === 'ws'
  const isTls = Boolean(node.tls?.enabled)
  if (isWs) {
    parts.push(isTls ? 'obfs=wss' : 'obfs=ws')
    if (node.transport?.path) parts.push(`obfs-uri=${node.transport.path}`)
    const host = node.transport?.host ?? node.tls?.serverName
    if (host) parts.push(`obfs-host=${host}`)
  } else if (isTls) {
    parts.push('obfs=over-tls')
    if (node.tls?.serverName) parts.push(`obfs-host=${node.tls.serverName}`)
  }
  if (node.tls?.insecure) parts.push('tls-verification=false')
}
