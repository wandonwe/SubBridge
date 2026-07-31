import { OUTPUT_FORMATS } from '@subbridge/core'
import { Hono } from 'hono'
import type { AppContext } from '../env'

export const VERSION = '1.0.0'

export const versionRoute = new Hono<AppContext>()

/** GET /api/version — build info and supported formats. */
versionRoute.get('/', (c) =>
  c.json(
    {
      name: 'SubBridge',
      version: VERSION,
      formats: OUTPUT_FORMATS,
      runtime: 'cloudflare-workers',
    },
    200,
    { 'Cache-Control': 'public, max-age=3600' },
  ),
)
