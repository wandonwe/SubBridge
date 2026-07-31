import { Hono } from 'hono'
import { renderSVG } from 'uqr'
import type { AppContext } from '../env'

const MAX_TEXT_LENGTH = 2048

export const qrcodeRoute = new Hono<AppContext>()

/**
 * GET /api/qrcode?text=...&size=256
 * Renders a crisp SVG QR code entirely at the edge — nothing is logged.
 */
qrcodeRoute.get('/', (c) => {
  const text = c.req.query('text')
  if (!text) return c.json({ error: 'missing `text` parameter' }, 400)
  if (text.length > MAX_TEXT_LENGTH) {
    return c.json({ error: `text too long (max ${MAX_TEXT_LENGTH} chars)` }, 400)
  }

  const svg = renderSVG(text, {
    ecc: 'M',
    border: 2,
    pixelSize: 8,
  })

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  })
})
