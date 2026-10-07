import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import type { AppContext } from '../src/env'
import { rateLimit } from '../src/middleware'

function appWith() {
  const app = new Hono<AppContext>()
  app.use('*', rateLimit())
  app.get('/', (c) => c.text('ok'))
  return app
}

describe('rateLimit', () => {
  it('passes through when no limiter binding is configured', async () => {
    const res = await appWith().request('/', {}, {} as AppContext['Bindings'])
    expect(res.status).toBe(200)
  })

  it('keys by client IP and returns 429 once the limiter says no', async () => {
    const seen: string[] = []
    let allow = true
    const env = {
      RATE_LIMITER: {
        limit: async ({ key }: { key: string }) => {
          seen.push(key)
          return { success: allow }
        },
      },
    } as unknown as AppContext['Bindings']
    const app = appWith()
    const headers = { 'CF-Connecting-IP': '203.0.113.7' }
    expect((await app.request('/', { headers }, env)).status).toBe(200)
    allow = false
    const blocked = await app.request('/', { headers }, env)
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('Retry-After')).toBe('60')
    expect(seen).toEqual(['203.0.113.7', '203.0.113.7'])
  })
})
