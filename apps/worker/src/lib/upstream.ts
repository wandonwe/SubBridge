import type { Subscription } from '@subbridge/core'
import { mergeSubscriptions, parseSubscription, parseUserInfoHeader } from '@subbridge/parser'
import { sha256Hex } from '@subbridge/utils'
import type { Env } from '../env'

const DEFAULT_UA = 'clash.meta/1.19.0 (SubBridge; +https://github.com/wandonwe/SubBridge)'
const MAX_BODY_BYTES = 8 * 1024 * 1024

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message)
  }
}

interface FetchedSub {
  body: string
  userInfo: string | null
}

/** Synthetic origin for Cache API keys — never fetched, only used as a key. */
const CACHE_ORIGIN = 'https://upstream-cache.subbridge.internal'

/**
 * Fetch one upstream subscription behind a short edge cache (Cache API), so
 * bursts of conversions never hammer the origin panel. The Cache API costs
 * no KV quota and keeps subscription bodies out of persistent storage; it is
 * per data center, and a no-op on *.workers.dev (every call then refetches).
 */
async function fetchOne(env: Env, url: string, userAgent?: string): Promise<FetchedSub> {
  const ttl = Math.max(60, Number(env.UPSTREAM_CACHE_TTL) || 300)
  const cacheKey = new Request(
    `${CACHE_ORIGIN}/${await sha256Hex(`${url}\u0000${userAgent ?? ''}`)}`,
  )
  const cache = caches.default

  const hit = await cache.match(cacheKey).catch(() => undefined)
  if (hit) return (await hit.json()) as FetchedSub

  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': userAgent || DEFAULT_UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    })
  } catch (err) {
    throw new UpstreamError(
      `failed to reach subscription: ${err instanceof Error ? err.message : 'network error'}`,
    )
  }
  if (!res.ok) throw new UpstreamError(`subscription responded with HTTP ${res.status}`)

  const length = Number(res.headers.get('content-length') ?? 0)
  if (length > MAX_BODY_BYTES) throw new UpstreamError('subscription too large', 413)

  const body = await res.text()
  if (body.length > MAX_BODY_BYTES) throw new UpstreamError('subscription too large', 413)

  const fetched: FetchedSub = {
    body,
    userInfo: res.headers.get('subscription-userinfo'),
  }
  // Best effort: a failed cache write must never fail the conversion.
  await cache
    .put(
      cacheKey,
      new Response(JSON.stringify(fetched), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${ttl}` },
      }),
    )
    .catch(() => undefined)
  return fetched
}

/**
 * Fetch and parse one or more subscription URLs (merged in order).
 * When `groups` is provided (parallel to `urls`), each subscription's nodes
 * are tagged with their set name so converters can keep them separate.
 * Returns the merged subscription plus the first `subscription-userinfo`
 * header so clients can display quota information.
 */
export async function loadSubscriptions(
  env: Env,
  urls: string[],
  userAgent?: string,
  groups?: string[],
): Promise<{ subscription: Subscription; userInfoHeader: string | null }> {
  const fetched = await Promise.all(urls.map((u) => fetchOne(env, u, userAgent)))
  const subs = fetched.map((f, i) => {
    const parsed = parseSubscription(f.body)
    const groupName = groups?.[i]
    const sub = groupName
      ? { ...parsed, nodes: parsed.nodes.map((n) => ({ ...n, group: groupName })) }
      : parsed
    const info = parseUserInfoHeader(f.userInfo)
    return info ? { ...sub, info } : sub
  })
  const subscription = mergeSubscriptions(subs)
  if (subscription.nodes.length === 0) {
    throw new UpstreamError('no usable nodes found in subscription', 422)
  }
  return { subscription, userInfoHeader: fetched.find((f) => f.userInfo)?.userInfo ?? null }
}
