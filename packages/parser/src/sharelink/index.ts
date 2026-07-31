import type { ProxyNode } from '@subbridge/core'
import { ParseError } from '@subbridge/core'
import { parseHysteria2 } from './hysteria2'
import { parseSs } from './ss'
import { parseTrojan } from './trojan'
import { parseTuic } from './tuic'
import { parseVless } from './vless'
import { parseVmess } from './vmess'

export { parseHysteria2, parseSs, parseTrojan, parseTuic, parseVless, parseVmess }

const PARSERS: Record<string, (link: string) => ProxyNode> = {
  ss: parseSs,
  vmess: parseVmess,
  vless: parseVless,
  trojan: parseTrojan,
  hysteria2: parseHysteria2,
  hy2: parseHysteria2,
  tuic: parseTuic,
}

/** True when the line looks like a supported proxy share link. */
export function isShareLink(line: string): boolean {
  const scheme = line.trim().toLowerCase().split('://')[0] ?? ''
  return Object.hasOwn(PARSERS, scheme)
}

/** Parse a single share link of any supported scheme. */
export function parseShareLink(link: string): ProxyNode {
  const scheme = link.trim().toLowerCase().split('://')[0] ?? ''
  const parser = PARSERS[scheme]
  if (!parser) throw new ParseError(`unsupported scheme "${scheme}"`, link)
  return parser(link)
}

/**
 * Parse a newline-separated list of share links, silently skipping lines
 * that fail to parse (real-world subscriptions frequently contain junk).
 */
export function parseShareLinks(text: string): ProxyNode[] {
  const nodes: ProxyNode[] = []
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || !isShareLink(trimmed)) continue
    try {
      nodes.push(parseShareLink(trimmed))
    } catch {
      // tolerate malformed lines
    }
  }
  return nodes
}
