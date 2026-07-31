import { convert } from '@subbridge/converter'
import { sha256Hex } from '@subbridge/utils'
import { Hono } from 'hono'
import type { AppContext } from '../env'
import { BadRequestError, type ConvertRequest, parseConvertParams } from '../lib/params'
import { loadSubscriptions, UpstreamError } from '../lib/upstream'

export const convertRoute = new Hono<AppContext>()

/**
 * GET /api/convert?url=...&target=mihomo&...
 *
 * The workhorse endpoint: fetches, parses, transforms and renders in one
 * pass at the edge. Emits ETag + Cache-Control and honours If-None-Match.
 */
convertRoute.get('/', async (c) => {
  let request: ConvertRequest
  try {
    request = parseConvertParams(new URL(c.req.url).searchParams)
  } catch (err) {
    if (err instanceof BadRequestError) return c.json({ error: err.message }, 400)
    throw err
  }
  return respondWithConversion(c.env, request, c.req.header('If-None-Match'))
})

export async function respondWithConversion(
  env: AppContext['Bindings'],
  request: ConvertRequest,
  ifNoneMatch?: string,
): Promise<Response> {
  try {
    const { subscription, userInfoHeader } = await loadSubscriptions(
      env,
      request.urls,
      request.options.userAgent,
    )
    const result = convert(subscription, request.target, request.options)

    const etag = `"${(await sha256Hex(result.content)).slice(0, 32)}"`
    const headers = new Headers({
      'Content-Type': result.contentType,
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      ETag: etag,
      'Content-Disposition': `attachment; filename="${request.filename ?? result.filename}"`,
      'Profile-Update-Interval': '24',
      'X-Content-Type-Options': 'nosniff',
    })
    if (userInfoHeader) headers.set('Subscription-Userinfo', userInfoHeader)

    if (ifNoneMatch === etag) return new Response(null, { status: 304, headers })
    return new Response(result.content, { status: 200, headers })
  } catch (err) {
    if (err instanceof UpstreamError) {
      return Response.json({ error: err.message }, { status: err.status })
    }
    if (err instanceof Error && err.name === 'ParseError') {
      return Response.json(
        { error: `unable to parse subscription: ${err.message}` },
        {
          status: 422,
        },
      )
    }
    throw err
  }
}
