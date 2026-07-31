<div align="center">

# 🌉 SubBridge

**Bridge Every Subscription.**

A modern, lightweight and secure subscription conversion platform for
Mihomo (Clash Verge), Sing-box, Hiddify, Shadowrocket, Surge and Quantumult X —
running entirely on Cloudflare Pages + Workers. No VPS required.

</div>

---

## Why SubBridge

Traditional subscription converters are heavy, hard to deploy and leak your
subscription URLs to third-party services. SubBridge is different:

- **Beautiful** — an Apple-style interface with frosted glass, fluid motion and native dark mode
- **Fast** — parsing and rendering happen at Cloudflare's edge, with layered caching and ETags
- **Private** — original subscription URLs are AES-256-GCM encrypted inside short links and never logged
- **Yours** — MIT-licensed, one-command deployment onto your own Cloudflare account
- **Mobile first** — designed for phones, with QR codes and one-tap client imports

## Supported formats

| Input | Output |
| --- | --- |
| Hiddify / Clash / Mihomo YAML | Mihomo (Clash Verge) YAML profile |
| Base64 subscriptions | Sing-box JSON config |
| Share links (`ss` `vmess` `vless` `trojan` `hysteria2` `tuic`) | Shadowrocket / Base64 |
| Multiple subscriptions merged | Surge 5 · Quantumult X · Share links |

Plus: node rename & regex filters, deduplication, merge, url-test groups,
remote rule sets, custom User-Agent, subscription caching and encrypted
short links.

## Architecture

```
subbridge/
├── apps/
│   ├── frontend/    React 19 · Vite · Tailwind CSS 4 · Framer Motion  → Cloudflare Pages
│   └── worker/      Hono · TypeScript                                 → Cloudflare Workers
└── packages/
    ├── core/        Canonical node model & shared types
    ├── parser/      Subscriptions & share links → canonical nodes
    ├── converter/   Canonical nodes → client formats
    ├── ui/          Apple-style glass UI primitives
    └── utils/       Runtime-agnostic helpers (base64, crypto, url)
```

Every input format is parsed into one canonical node model, and every output
format is rendered from it — adding a client is a single new renderer.

## API

| Endpoint | Description |
| --- | --- |
| `GET /api/convert?url=…&target=mihomo` | Convert one or more subscriptions |
| `GET /api/share/:id` | Resolve an encrypted short link |
| `POST /api/short` | Create an encrypted short link |
| `GET /api/qrcode?text=…` | Render an SVG QR code |
| `GET /api/version` | Build & format information |

### `GET /api/convert` parameters

| Param | Description |
| --- | --- |
| `url` | Subscription URL — repeatable (or `\|`-separated) to merge |
| `group` | Named node set per `url` (repeatable, e.g. `group=Prime&group=Backup`) — keeps each subscription's nodes in its own selectable group |
| `target` | `mihomo` `singbox` `shadowrocket` `surge` `quantumultx` `base64` `sharelink` |
| `include` / `exclude` | Regex filters on node names |
| `rename` | `search->replace` rule, repeatable, regex supported |
| `prefix` | Prefix added to every node name |
| `dedupe` / `sort` | `1` to enable |
| `urltest` | `0` to skip the auto url-test group |
| `rules` | `none` for a rule-free config (MATCH only) |
| `ua` | Custom User-Agent sent to the upstream |
| `token` | API token, if the instance sets one |

Responses include `ETag`, `Cache-Control`, `Subscription-Userinfo`
pass-through and honour `If-None-Match` with `304`.

### `POST /api/short`

```jsonc
// body: any /api/convert parameters, plus optional ttlDays
{ "url": "https://example.com/sub", "target": "singbox", "ttlDays": 90 }
// → { "id": "aB3xK9mP2q", "url": "https://your.app/api/share/aB3xK9mP2q" }
```

The stored payload is sealed with AES-256-GCM using your `SECRET` — a KV dump
reveals nothing about the original subscription.

## Deploy your own

SubBridge is built to be forked. **Fork the repo, add three Cloudflare secrets,
push** — a GitHub Action provisions storage, deploys the API and the site to
your own Cloudflare account, and wires them together. No VPS, no code changes.

👉 **Full walkthrough: [DEPLOY.md](DEPLOY.md)**

Quick version:

1. Fork this repository.
2. Create a Cloudflare API token (permissions: Workers Scripts:Edit, Workers KV
   Storage:Edit, Cloudflare Pages:Edit) and grab your Account ID.
3. In your fork → Settings → Secrets and variables → Actions, add
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and (optional)
   `SUBBRIDGE_SECRET` for encrypted short links.
4. Push, or run the **Deploy** workflow from the Actions tab.

Your instance comes up at `subbridge.pages.dev` with the API on your own
`workers.dev` subdomain. Bring your own domain anytime — see DEPLOY.md.

## Deployment (details)

### 1. Worker (API)

```bash
cd apps/worker
wrangler kv namespace create SUBBRIDGE_KV     # put the id into wrangler.toml
wrangler secret put SECRET                    # enables encrypted short links
# optional hardening:
# wrangler secret put API_TOKEN
pnpm deploy
```

### 2. Frontend (Pages)

```bash
pnpm --filter @subbridge/frontend build
# Deploy apps/frontend/dist with Cloudflare Pages.
# Point /api/* at your worker: edit apps/frontend/public/_redirects,
# or attach a route / custom domain so Pages and the Worker share an origin.
```

Configuration lives in `apps/worker/wrangler.toml`: `CORS_ORIGINS`,
`RATE_LIMIT_PER_MINUTE`, `UPSTREAM_CACHE_TTL`.

### 3. Auto-deploy from GitHub

`.github/workflows/deploy.yml` deploys both apps on every push to `main`.
One-time setup:

1. Create a Cloudflare API token (dashboard → My Profile → API Tokens) with
   **Workers Scripts: Edit** and **Cloudflare Pages: Edit** permissions.
2. In the GitHub repo, add two Actions secrets:
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
3. Make sure the KV namespace id is filled in `apps/worker/wrangler.toml`
   and secrets were set once via `wrangler secret put SECRET` — they live in
   Cloudflare, not in the repo.

After that, `git push` is the whole deployment story.

## Development

```bash
pnpm install
pnpm dev            # frontend on :5173 (proxies /api → :8787) + worker on :8787
pnpm test           # vitest
pnpm typecheck      # strict TS across the workspace
pnpm lint           # biome
pnpm build          # all apps
```

## Security model

- The frontend never sees subscription contents — conversion happens on the worker
- Short-link payloads are AES-256-GCM encrypted with a key only your worker holds
- Optional `API_TOKEN` gates conversion endpoints (constant-time comparison)
- Per-IP rate limiting and a CORS origin whitelist are built in
- `X-Content-Type-Options: nosniff` and size limits on everything user-supplied

## License

[MIT](LICENSE) — build something great on it.
