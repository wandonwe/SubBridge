# 部署你自己的 SubBridge

[English](DEPLOY.md) · **简体中文** — 转换器使用说明见 [USAGE.zh-CN.md](USAGE.zh-CN.md)

SubBridge 完全运行在 Cloudflare 免费套餐上。Fork 本仓库,几分钟内就能拥有一个
属于自己的私有实例——不需要 VPS,不需要服务器,不需要改任何代码。

部署方式有两种:**GitHub 自动部署**(推荐,推送即部署)或**手动 CLI**。二选一即可。

---

## 方式 A —— GitHub 自动部署(推荐)

每次推送到 `main` 分支,都会自动构建并部署 API(Worker)和网站(Pages)。
首次配置只需要 3 个 Secret 和一次点击。

### 1. Fork 本仓库

点击 GitHub 页面顶部的 **Fork**。之后的所有操作都发生在*你的* fork 和*你的* Cloudflare 账号里。

### 2. 获取 Cloudflare 凭证

需要从 <https://dash.cloudflare.com> 拿到两个值:

- **Account ID(账户 ID)**——打开仪表盘任意页面,右侧栏就有(32 位十六进制字符串),
  也藏在网址里:`dash.cloudflare.com/<账户ID>/…`
- **API Token(API 令牌)**——右上角头像 → **My Profile** → **API Tokens** →
  **Create Token** → 最底部 **Create Custom Token**。添加以下权限(均为 *Account* 级):
  - **Workers Scripts** → Edit(编辑)
  - **Workers KV Storage** → Edit(编辑)
  - **Cloudflare Pages** → Edit(编辑)

  创建后立刻复制令牌(只显示一次)。

### 3. 添加仓库 Secret

在你的 fork 中:**Settings → Secrets and variables → Actions → New repository secret**,依次添加:

| Secret | 必填 | 值 |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | ✅ | 第 2 步创建的 API 令牌 |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | 第 2 步的账户 ID |
| `SUBBRIDGE_SECRET` | 可选 | 任意长随机字符串——启用加密短链 |
| `API_DOMAIN` | 可选 | 自定义 API 域名,如 `api.example.com`(见下文) |
| `CORS_ORIGINS` | 可选 | 逗号分隔的来源白名单,如 `https://sub.example.com`;不设则允许任意来源 |
| `PAGES_PROJECT` | 可选 | Pages 项目名 = `<名字>.pages.dev`(全球唯一);默认 `subbridge-<账户ID前8位>` |

> 生成高强度 `SUBBRIDGE_SECRET`:
> `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

### 4. 触发部署

随便推送一个提交,**或者**打开 **Actions** 标签页 → **Deploy** → **Run workflow**。
部署流程会自动完成以下所有事情:

1. 创建 `SUBBRIDGE_KV` 存储并写入 `wrangler.toml`
2. 部署 Worker
3. 设置短链密钥(如果你提供了)
4. 把前端指向你的 API 地址
5. 构建并部署 Pages 网站

跑绿之后,你的地址是:

- **网站** —— `https://<项目名>.pages.dev`(默认 `subbridge-<账户ID前8位>.pages.dev`;pages.dev 名称全球唯一,所以默认按账号生成,fork 之间不会冲突)
- **API** —— `https://subbridge-api.<你的子域>.workers.dev`

验证:访问 `https://<你的API>/api/version`,返回 JSON 即部署成功。

---

## 方式 B —— 手动 CLI

```bash
git clone https://github.com/<你>/subbridge && cd subbridge
pnpm install

cd apps/worker
npx wrangler login
npx wrangler kv namespace create SUBBRIDGE_KV   # 把 id 填进 wrangler.toml
npx wrangler secret put SECRET                  # 启用短链
npx wrangler deploy                             # 记下打印出来的 API 地址

# 回到仓库根目录:把 API 地址喂给前端构建
VITE_API_BASE=https://<你的API地址> pnpm --filter @subbridge/frontend build
npx wrangler pages deploy apps/frontend/dist --project-name subbridge
```

---

## 绑定自定义域名(可选)

`workers.dev` 和 `pages.dev` 在任何地区都能用,但绑定自己 Cloudflare 账号里的域名
在某些网络环境下更稳定。

**API** —— Cloudflare 仪表盘 → **Workers & Pages** → **subbridge-api** →
**Settings** → **Domains & Routes** → **Add** → **Custom domain** → 输入如
`api.example.com`。然后把 `API_DOMAIN` Secret 设为该域名并重新运行部署,前端就会指向它。
(前提:该域名已作为站点添加到你的 Cloudflare 账号。)

**网站** —— **Workers & Pages** → **subbridge** → **Custom domains** → 添加如
`sub.example.com`。

---

## 配置项参考

`apps/worker/wrangler.toml` 的 `[vars]`:

| 变量 | 默认值 | 含义 |
| --- | --- | --- |
| `CORS_ORIGINS` | `*` | 逗号分隔的来源白名单;建议收紧到你的站点 |
| `RATE_LIMIT_PER_MINUTE` | `60` | `/api/*` 每 IP 每分钟请求上限(0 关闭) |
| `UPSTREAM_CACHE_TTL` | `300` | 上游订阅缓存秒数 |

Secret(`wrangler secret put …` 或上文的 GitHub Secret):

| Secret | 含义 |
| --- | --- |
| `SECRET` | 短链加密密钥(`POST /api/short` 必需) |
| `API_TOKEN` | 可选访问令牌,保护 `/api/convert` 和 `/api/short` |

---

## 常见问题排查

- **刚绑自定义域名就访问,报 `ERR_CONNECTION_CLOSED`** —— Cloudflare 还在签发
  TLS 证书,等 10 分钟左右。若持续报错,该域名可能在你的网络环境被干扰,改用
  `workers.dev` 地址即可。
- **部署在 "Provision KV namespace" 一步失败** —— API 令牌缺少
  **Workers KV Storage: Edit** 权限。编辑令牌补上后重新运行。
- **短链返回 HTTP 501** —— 没有设置 `SUBBRIDGE_SECRET`;补上后重新部署。
- **网站能打开但转换失败** —— 前端连不上 API。查看部署日志里
  "Resolve API endpoint" 一步,确认解析出了正确的 API 地址。
