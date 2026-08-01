# SubBridge usage — converting subscriptions

**English** · [简体中文](USAGE.zh-CN.md) — deployment guide: [DEPLOY.md](DEPLOY.md)

This guide covers what to type into the converter and what comes out of it.

## Quick start

1. Open your SubBridge site.
2. Paste your subscription URL(s) into the **Subscription URL** box.
3. Pick an **Output format**, optionally set a **Profile name**.
4. Hit **Generate Subscription**, then copy the link / scan the QR code /
   tap "Open in client".

The generated link is a live converter URL — your client refetches it on every
update, so it always reflects the current upstream subscription.

## Input: what you can paste

Accepted upstream formats (auto-detected):

- Clash / Mihomo YAML subscriptions (what Hiddify and most panels serve)
- Classic Base64 subscriptions (v2ray style)
- Plain share links: `ss://` `vmess://` `vless://` `trojan://`
  `hysteria2://` (`hy2://`) `tuic://`

### One line per subscription

```text
https://example.com/sub
```

Multiple lines are **merged** into one output, in order.

### Named node sets

Prefix a line with a name to keep that subscription's nodes in their own
selectable group:

```text
Prime https://example.com/sub-a
Backup https://example.com/sub-b
```

This produces `Prime` and `Backup` groups in the client; every policy group
(OpenAI, Media, …) can point at a specific set. A set named `Backup` is
automatically the default for the OpenAI policy.

### Per-set scheduling strategy

Append `,auto` or `,fallback` after the name:

```text
Prime,auto https://example.com/sub-a        ← url-test: fastest node wins
Backup,fallback https://example.com/sub-b   ← failover: first healthy node
Other https://example.com/sub-c             ← manual select (default)
```

The set's icon follows its strategy (⚡ auto / 🧯 fallback / ✓ select).

### Built-in pools

Every config also ships two global pools, selectable inside `Proxy`:

- **AUTO** — url-test across *all* nodes (lazy health checks)
- **FALLBACK** — failover across your sets in order (Prime → Backup)

## Output formats

| Format | Notes |
| --- | --- |
| Mihomo (Clash Verge) | Full YAML profile with policy groups & rules |
| Sing-box | JSON config with rule sets + Clash API (metacubexd dashboard) |
| Shadowrocket | Base64 subscription |
| Surge | Surge 5 managed profile (vless nodes are skipped — unsupported) |
| Quantumult X | Server snippet (server-only; no rules) |
| Base64 | Universal v2ray-style subscription |
| Share Links | Plain list of URIs |

## Rule presets

Pick in **Advanced options → Rule set** (or `rules=` in the API):

| Preset | Contents |
| --- | --- |
| **Default** | Balanced policy: Apple, ads→Guard, OpenAI, Claude, GitHub, Microsoft, YouTube, Google, Telegram, Netflix, Spotify, TikTok, CN direct, global proxy |
| **Full** | Default **plus** Gemini, Disney+, Prime Video, a Games group (default DIRECT) and Telegram IP ranges (no-resolve) |
| **Lite** | Minimal & fastest: ads / CN / global only — for routers & low-end devices |
| **None** | No rules; everything through Proxy |

All rule sets use binary formats (mrs / srs) for fast matching and update
themselves daily on the client.

## Advanced options

| Option | Effect |
| --- | --- |
| Include nodes (regex) | Keep only nodes whose name matches, e.g. `HK\|SG\|JP` |
| Exclude nodes (regex) | Drop matching nodes, e.g. `expired\|traffic` |
| Rename rules | One `search->replace` per line, regex supported, e.g. `香港->HK` |
| Name prefix | Prepended to every node name |
| Deduplicate nodes | Drop nodes with identical endpoints |
| Sort by name | Alphabetical node order |
| Auto url-test group | Toggle the AUTO / FALLBACK pools |

## API (for scripts and clients)

Everything the UI does maps to `GET /api/convert`:

```text
https://<your-api>/api/convert
  ?url=<subscription-url>          # repeatable; merged in order
  &group=Prime,auto                # optional, parallel to url; name[,auto|fallback]
  &group=Backup,fallback
  &target=mihomo                   # mihomo | singbox | shadowrocket | surge
                                   # | quantumultx | base64 | sharelink
  &filename=MyNodes                # profile name shown in the client
  &rules=full                      # lite | default | full | none
  &include=HK|SG &exclude=expired
  &rename=香港->HK &prefix=[SB]%20
  &dedupe=1 &sort=1 &urltest=0
  &ua=<custom-upstream-user-agent>
  &token=<api-token-if-configured>
```

Other endpoints: `POST /api/short` (encrypted short link),
`GET /api/share/:id`, `GET /api/qrcode?text=…`, `GET /api/version`.

## Privacy

- Conversion happens on your own Cloudflare Worker; nothing is logged or stored.
- The web page keeps **no history** — generated links vanish on refresh.
- Short links are AES-256-GCM encrypted; even a KV dump reveals nothing.
