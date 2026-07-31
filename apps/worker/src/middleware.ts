import { timingSafeEqual } from '@subbridge/utils'
import type { MiddlewareHandler } from 'hono'
import type { AppContext } from './env'

/** CORS with a configurable origin whitelist (`*` allows any origin). */
export function corsWhitelist(): MiddlewareHandler<AppContext> {
  return async (c, next) => {
    const allowed = (c.env.CORS_ORIGINS ?? '*').split(',').map((s) => s.trim())
    const origin = c.req.header('Origin')
    const allowAny = allowed.includes('*')
    const allowOrigin = allowAny ? '*' : origin && allowed.includes(origin) ? origin : null

    if (c.req.method === 'OPTIONS') {
      const headers = new Headers({
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      })
      if (allowOrigin) headers.set('Access-Control-Allow-Origin', allowOrigin)
      if (!allowAny) headers.set('Vary', 'Origin')
      return new Response(null, { status: 204, headers })
    }

    await next()
    if (allowOrigin) c.res.headers.set('Access-Control-Allow-Origin', allowOrigin)
    if (!allowAny) c.res.headers.append('Vary', 'Origin')
  }
}

/**
 * Fixed-window per-IP rate limit backed by KV. Coarse by design: KV is
 * eventually consistent, which is fine for abuse protection at the edge.
 */
export function rateLimit(): MiddlewareHandler<AppContext> {
  return async (c, next) => {
    const limit = Number(c.env.RATE_LIMIT_PER_MINUTE) || 0
    if (limit <= 0) return next()

    const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
    const windowStart = Math.floor(Date.now() / 60_000)
    const key = `rl:${ip}:${windowStart}`
    const count = Number((await c.env.SUBBRIDGE_KV.get(key)) ?? 0)

    if (count >= limit) {
      return c.json({ error: 'rate limit exceeded, try again in a minute' }, 429, {
        'Retry-After': '60',
      })
    }
    // Fire-and-forget: don't block the request on the counter write.
    c.executionCtx.waitUntil(c.env.SUBBRIDGE_KV.put(key, String(count + 1), { expirationTtl: 120 }))
    return next()
  }
}

/** Optional bearer-token gate, active only when API_TOKEN is configured. */
export function tokenAuth(): MiddlewareHandler<AppContext> {
  return async (c, next) => {
    const expected = c.env.API_TOKEN
    if (!expected) return next()

    const header = c.req.header('Authorization') ?? ''
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : ''
    const provided = bearer || c.req.query('token') || ''
    if (!provided || !timingSafeEqual(provided, expected)) {
      return c.json({ error: 'missing or invalid API token' }, 401)
    }
    return next()
  }
}
