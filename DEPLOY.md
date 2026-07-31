# Deploy your own SubBridge

SubBridge runs entirely on Cloudflare's free tier. Fork this repo and you have
your own private instance in a few minutes — no VPS, no server, no code changes.

There are two ways to deploy: **GitHub auto-deploy** (recommended — push and
forget) or **manual CLI**. Pick one.

---

## Option A — GitHub auto-deploy (recommended)

Every push to `main` builds and deploys both the API (Worker) and the site
(Pages) automatically. First-time setup is three secrets and one click.

### 1. Fork this repository

Click **Fork** at the top of the GitHub page. Everything below happens in
*your* fork and *your* Cloudflare account.

### 2. Get your Cloudflare credentials

You need two values from <https://dash.cloudflare.com>:

- **Account ID** — open any page of the dashboard; it's in the right sidebar
  (a 32-character hex string). It's also in the URL: `dash.cloudflare.com/<ACCOUNT_ID>/…`
- **API Token** — top-right avatar → **My Profile** → **API Tokens** →
  **Create Token** → **Create Custom Token**. Give it these permissions
  (all *Account*-scoped):
  - **Workers Scripts** → Edit
  - **Workers KV Storage** → Edit
  - **Cloudflare Pages** → Edit

  Create it and copy the token (shown only once).

### 3. Add repository secrets

In your fork: **Settings → Secrets and variables → Actions → New repository
secret**. Add:

| Secret | Required | Value |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | ✅ | the API token from step 2 |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | your account id from step 2 |
| `SUBBRIDGE_SECRET` | optional | any long random string — enables encrypted short links |
| `API_DOMAIN` | optional | a custom API hostname like `api.example.com` (see below) |

> Generate a good `SUBBRIDGE_SECRET` with:
> `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

### 4. Run the deploy

Push any commit, **or** go to the **Actions** tab → **Deploy** → **Run
workflow**. The workflow will, on its own:

1. create the `SUBBRIDGE_KV` namespace and wire it into `wrangler.toml`
2. deploy the Worker
3. set the short-link secret (if you provided one)
4. point the frontend at your API endpoint
5. build and deploy the Pages site

When it goes green, your URLs are:

- **Site** — `https://subbridge.pages.dev` (or your Pages custom domain)
- **API** — `https://subbridge-api.<your-subdomain>.workers.dev`

Verify the API with `https://<your-api>/api/version` — it should return JSON.

---

## Option B — manual CLI

```bash
git clone https://github.com/<you>/subbridge && cd subbridge
pnpm install

cd apps/worker
npx wrangler login
npx wrangler kv namespace create SUBBRIDGE_KV   # paste the id into wrangler.toml
npx wrangler secret put SECRET                  # enables short links
npx wrangler deploy                             # note the printed API URL

# back at the repo root: put your API host into apps/frontend/public/_redirects
#   replace API_ENDPOINT with e.g. subbridge-api.<subdomain>.workers.dev
pnpm --filter @subbridge/frontend build
npx wrangler pages deploy apps/frontend/dist --project-name subbridge
```

---

## Using a custom domain (optional)

`workers.dev` and `pages.dev` work everywhere, but a domain on your own
Cloudflare account is more stable in some regions.

**API** — Cloudflare dashboard → **Workers & Pages** → **subbridge-api** →
**Settings** → **Domains & Routes** → **Add** → **Custom domain** → e.g.
`api.example.com`. Then add the `API_DOMAIN` secret with that hostname and
re-run the deploy so the frontend points at it. (The domain must already be a
zone in your Cloudflare account.)

**Site** — **Workers & Pages** → **subbridge** → **Custom domains** → add e.g.
`sub.example.com`.

---

## Configuration reference

`apps/worker/wrangler.toml` `[vars]`:

| Variable | Default | Meaning |
| --- | --- | --- |
| `CORS_ORIGINS` | `*` | comma-separated allowed origins; tighten to your site for safety |
| `RATE_LIMIT_PER_MINUTE` | `60` | per-IP request cap on `/api/*` (0 disables) |
| `UPSTREAM_CACHE_TTL` | `300` | seconds to cache fetched subscriptions |

Secrets (`wrangler secret put …`, or GitHub secrets above):

| Secret | Meaning |
| --- | --- |
| `SECRET` | encryption key for short links (required for `POST /api/short`) |
| `API_TOKEN` | optional bearer token gating `/api/convert` and `/api/short` |

---

## Troubleshooting

- **`/api/version` shows `ERR_CONNECTION_CLOSED` right after adding a custom
  domain** — Cloudflare is still issuing the TLS certificate; wait ~10 minutes.
  If it persists, that hostname may be network-filtered in your region; use the
  `workers.dev` URL instead.
- **Deploy fails at "Provision KV namespace"** — your API token is missing the
  **Workers KV Storage: Edit** permission. Edit the token and re-run.
- **Short links return HTTP 501** — `SUBBRIDGE_SECRET` isn't set; add it and
  re-deploy.
- **Site loads but conversions fail** — the frontend can't reach the API. Check
  that `apps/frontend/public/_redirects` resolved to your real API host in the
  deploy log's "Resolve API endpoint" step.
