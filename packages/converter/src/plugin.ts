import type { ProxyNode } from '@subbridge/core'

/**
 * Shadowsocks plugins arrive in two dialects:
 *  - SIP002 share links: `obfs-local;obfs=http;obfs-host=x`, `v2ray-plugin;tls;host=x;path=/`
 *  - Clash YAML:         `obfs` + `mode=http;host=x`, `v2ray-plugin` + `mode=websocket;tls;host=x`
 * Every renderer needs one of these, so normalise once here.
 */
export type SsPlugin =
  | { kind: 'obfs'; mode: 'http' | 'tls'; host?: string }
  | { kind: 'v2ray'; tls: boolean; host?: string; path?: string }
  | { kind: 'unsupported'; name: string }

export function normalizeSsPlugin(node: ProxyNode): SsPlugin | null {
  if (node.protocol !== 'ss' || !node.plugin) return null
  const opts: Record<string, string | true> = {}
  for (const part of (node.pluginOpts ?? '').split(';')) {
    if (!part) continue
    const eq = part.indexOf('=')
    if (eq === -1) opts[part.trim()] = true
    else opts[part.slice(0, eq).trim()] = part.slice(eq + 1).trim()
  }
  const str = (v: string | true | undefined) => (typeof v === 'string' && v ? v : undefined)

  if (node.plugin === 'obfs-local' || node.plugin === 'simple-obfs' || node.plugin === 'obfs') {
    const mode = str(opts.obfs) ?? str(opts.mode) ?? 'http'
    if (mode !== 'http' && mode !== 'tls') return { kind: 'unsupported', name: node.plugin }
    return { kind: 'obfs', mode, host: str(opts['obfs-host']) ?? str(opts.host) }
  }
  if (node.plugin === 'v2ray-plugin') {
    const mode = str(opts.mode) ?? 'websocket'
    if (mode !== 'websocket') return { kind: 'unsupported', name: node.plugin }
    const tls = opts.tls === true || opts.tls === 'true'
    return { kind: 'v2ray', tls, host: str(opts.host), path: str(opts.path) }
  }
  return { kind: 'unsupported', name: node.plugin }
}

/** Surge / Quantumult X lines are comma-separated `key=value` lists. */
export function safeLineName(name: string): string {
  return name.replace(/[,=]/g, ' ').replace(/\s+/g, ' ').trim()
}
