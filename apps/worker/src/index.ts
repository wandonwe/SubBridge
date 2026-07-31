import { Hono } from 'hono'
import type { AppContext } from './env'
import { corsWhitelist, rateLimit, tokenAuth } from './middleware'
import { convertRoute } from './routes/convert'
import { qrcodeRoute } from './routes/qrcode'
import { shareRoute, shortRoute } from './routes/short'
import { versionRoute } from './routes/version'

const app = new Hono<AppContext>()

app.use('/api/*', corsWhitelist())
app.use('/api/*', rateLimit())
// Share links carry their own unguessable capability id; everything else
// that touches upstream subscriptions honours the optional API token.
app.use('/api/convert', tokenAuth())
app.use('/api/short', tokenAuth())

app.route('/api/convert', convertRoute)
app.route('/api/short', shortRoute)
app.route('/api/share', shareRoute)
app.route('/api/qrcode', qrcodeRoute)
app.route('/api/version', versionRoute)

app.get('/', (c) =>
  c.json({
    name: 'SubBridge API',
    docs: 'https://github.com/subbridge/subbridge#api',
    endpoints: ['/api/convert', '/api/share/:id', '/api/qrcode', '/api/short', '/api/version'],
  }),
)

app.notFound((c) => c.json({ error: 'not found' }, 404))

app.onError((err, c) => {
  console.error('unhandled error', err)
  return c.json({ error: 'internal error' }, 500)
})

export default app
