import { randomId } from '@subbridge/utils'
import { Hono } from 'hono'
import type { AppContext } from '../env'
import { seal, unseal } from '../lib/crypto'
import { BadRequestError, type ConvertRequest, parseConvertParams } from '../lib/params'
import { respondWithConversion } from './convert'

const SHORT_PREFIX = 'sl:'
const MAX_TTL_DAYS = 365

export const shortRoute = new Hono<AppContext>()
export const shareRoute = new Hono<AppContext>()

interface ShortPayload {
  query: string
  createdAt: number
}

/**
 * POST /api/short
 *
 * Body: the same parameters /api/convert accepts, as JSON
 * (`{ "url": "...", "target": "mihomo", ... }`) — arrays allowed for
 * repeatable keys. Returns an opaque, encrypted short link that never
 * exposes the original subscription URL.
 */
shortRoute.post('/', async (c) => {
  if (!c.env.SECRET) {
    return c.json({ error: 'short links are disabled: SECRET is not configured' }, 501)
  }

  let body: Record<string, unknown>
  try {
    body = await c.req.json<Record<string, unknown>>()
  } catch {
    return c.json({ error: 'body must be JSON' }, 400)
  }

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(body)) {
    if (key === 'ttlDays') continue
    for (const v of Array.isArray(value) ? value : [value]) {
      if (v !== undefined && v !== null) params.append(key, String(v))
    }
  }

  try {
    parseConvertParams(params) // validate now, fail fast
  } catch (err) {
    if (err instanceof BadRequestError) return c.json({ error: err.message }, 400)
    throw err
  }

  const ttlDays = Math.min(Number(body.ttlDays) || MAX_TTL_DAYS, MAX_TTL_DAYS)
  const id = randomId(10)
  const payload: ShortPayload = { query: params.toString(), createdAt: Date.now() }
  await c.env.SUBBRIDGE_KV.put(
    `${SHORT_PREFIX}${id}`,
    await seal(c.env.SECRET, JSON.stringify(payload)),
    { expirationTtl: ttlDays * 86_400 },
  )

  const origin = new URL(c.req.url).origin
  return c.json(
    {
      id,
      url: `${origin}/api/share/${id}`,
      expiresInDays: ttlDays,
    },
    201,
  )
})

/**
 * GET /api/share/:id — resolve an encrypted short link and stream the
 * conversion. This is the URL end users paste into their client.
 */
shareRoute.get('/:id', async (c) => {
  if (!c.env.SECRET) {
    return c.json({ error: 'short links are disabled: SECRET is not configured' }, 501)
  }
  const id = c.req.param('id')
  const sealed = await c.env.SUBBRIDGE_KV.get(`${SHORT_PREFIX}${id}`)
  if (!sealed) return c.json({ error: 'short link not found or expired' }, 404)

  const plaintext = await unseal(c.env.SECRET, sealed)
  if (!plaintext) return c.json({ error: 'short link cannot be decrypted' }, 410)

  const payload = JSON.parse(plaintext) as ShortPayload
  let request: ConvertRequest
  try {
    request = parseConvertParams(new URLSearchParams(payload.query))
  } catch (err) {
    if (err instanceof BadRequestError) return c.json({ error: err.message }, 400)
    throw err
  }
  return respondWithConversion(c.env, request, c.req.header('If-None-Match'))
})
