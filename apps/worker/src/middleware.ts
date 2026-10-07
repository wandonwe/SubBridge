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
 * Per-IP rate limit via Cloudflare's native Rate Limiting binding. Counters
 * live in memory on the edge (no KV reads/writes, so no KV quota is spent);
 * they are approximate and per data center, which is fine for abuse
 * protection. Removing the [[ratelimits]] block in wrangler.toml disables it.
 */
export function rateLimit(): MiddlewareHandler<AppContext> {
  return async (c, next) => {
    const limiter = c.env.RATE_LIMITER
    if (!limiter) return next()

    const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
    const { success } = await limiter.limit({ key: ip })
    if (!success) {
      return c.json({ error: 'rate limit exceeded, try again in a minute' }, 429, {
        'Retry-After': '60',
      })
    }
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
