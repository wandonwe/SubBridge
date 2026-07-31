import type { ProxyNode, Subscription, SubscriptionInfo } from '@subbridge/core'
import { ParseError } from '@subbridge/core'
import { looksLikeB64, tryB64decode } from '@subbridge/utils'
import { looksLikeClash, parseClash } from './clash'
import { isShareLink, parseShareLinks } from './sharelink'

/**
 * Parse any supported subscription payload into canonical nodes.
 *
 * Detection order:
 *  1. Clash / Mihomo YAML (Hiddify and most panels expose this)
 *  2. Plain list of share links
 *  3. Base64-wrapped list of share links (classic v2ray subscription)
 */
export function parseSubscription(content: string): Subscription {
  const text = content.trim()
  if (!text) throw new ParseError('empty subscription')

  if (looksLikeClash(text)) {
    return { nodes: parseClash(text) }
  }

  if (hasShareLinkLines(text)) {
    return { nodes: parseShareLinks(text) }
  }

  if (looksLikeB64(text)) {
    const decoded = tryB64decode(text)
    if (decoded) {
      if (looksLikeClash(decoded)) return { nodes: parseClash(decoded) }
      if (hasShareLinkLines(decoded)) return { nodes: parseShareLinks(decoded) }
    }
  }

  throw new ParseError('unrecognised subscription format')
}

/** Parse the standard `subscription-userinfo` response header. */
export function parseUserInfoHeader(header: string | null): SubscriptionInfo | undefined {
  if (!header) return undefined
  const info: SubscriptionInfo = {}
  for (const part of header.split(';')) {
    const [key, value] = part.split('=').map((s) => s.trim())
    if (!key || value === undefined) continue
    const num = Number(value)
    if (Number.isNaN(num)) continue
    if (key === 'upload') info.upload = num
    else if (key === 'download') info.download = num
    else if (key === 'total') info.total = num
    else if (key === 'expire') info.expire = num
  }
  return Object.keys(info).length > 0 ? info : undefined
}

/** Merge multiple subscriptions, preserving order. */
export function mergeSubscriptions(subs: Subscription[]): Subscription {
  const nodes: ProxyNode[] = subs.flatMap((s) => s.nodes)
  const info = subs.find((s) => s.info)?.info
  return info ? { nodes, info } : { nodes }
}

function hasShareLinkLines(text: string): boolean {
  return text.split(/\r?\n/).some((line) => isShareLink(line))
}
