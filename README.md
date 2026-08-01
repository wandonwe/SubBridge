<div align="center">

# 🌉 SubBridge

**Bridge Every Subscription. —— 最方便的自建节点转换工具**

一个现代、轻量、安全的订阅转换平台,支持 Mihomo (Clash Verge)、Sing-box、
Hiddify、Shadowrocket、Surge、Quantumult X ——
完全运行在 Cloudflare Pages + Workers 上,**无需 VPS,免费自建**。

**简体中文** · [English](README.en.md)

**文档:**[部署指南](DEPLOY.zh-CN.md) · [使用说明](USAGE.zh-CN.md)

</div>

---

## 为什么选 SubBridge

传统订阅转换器要么部署繁琐,要么把你的订阅链接交给第三方服务。SubBridge 不一样:

- **最方便的自建**——Fork 仓库、填 3 个 Secret、推送,几分钟拥有自己的实例;之后每次 `git push` 自动部署,零运维
- **零成本**——跑在 Cloudflare 免费套餐上,不需要服务器,全球 300+ 边缘节点加速
- **隐私优先**——转换在你自己的 Worker 上完成,不记录、不存储;网页无历史记录;短链 AES-256-GCM 加密,原始订阅永不暴露
- **好看好用**——苹果风格界面,毛玻璃质感,原生深色模式,移动端优先,扫码即导入
- **能打**——多订阅合并、命名节点集(自动测速 / 故障转移 / 手动)、统一分流策略、四档规则集预设、正则过滤重命名

## 支持的格式

| 输入 | 输出 |
| --- | --- |
| Hiddify / Clash / Mihomo YAML | Mihomo (Clash Verge) 完整配置(策略组 + 规则) |
| Base64 订阅 | Sing-box JSON 配置(规则集 + Clash API 面板) |
| 分享链接(`ss` `vmess` `vless` `trojan` `hysteria2` `tuic`) | Shadowrocket / Base64 |
| 多条订阅合并 | Surge 5 · Quantumult X · 分享链接列表 |

另有:节点重命名与正则过滤、去重、合并、命名节点集(`Prime,auto` 语法)、
AUTO 测速池、FALLBACK 故障转移池、统一分流策略(OpenAI / Claude / Media /
Guard 等专用策略组)、规则集预设(Lite / Default / Full)、自定义配置名、
订阅缓存、加密短链。

## 三分钟自建

1. **Fork 本仓库**
2. 在 Cloudflare 创建 API 令牌(权限:Workers Scripts / Workers KV Storage /
   Cloudflare Pages,均为 Edit),复制账户 ID
3. 在你的 fork 里添加两个 Secret:`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`
4. 推送任意提交,或在 Actions 页手动运行 **Deploy**

部署流程会自动创建存储、部署 API 和网站并把它们连好。完整步骤(含自定义域名、
加密短链、访问控制)见 [部署指南](DEPLOY.zh-CN.md)。

## 架构

```
subbridge/
├── apps/
│   ├── frontend/    React 19 · Vite · Tailwind CSS 4 · Framer Motion  → Cloudflare Pages
│   └── worker/      Hono · TypeScript                                 → Cloudflare Workers
└── packages/
    ├── core/        统一节点模型与共享类型
    ├── parser/      订阅与分享链接 → 统一节点模型
    ├── converter/   统一节点模型 → 各客户端格式
    ├── ui/          苹果风格 UI 组件
    └── utils/       通用工具(base64、加密、URL)
```

所有输入格式都先解析为统一节点模型,再渲染为目标格式——新增一个客户端只需
写一个渲染器。

## API

| 端点 | 说明 |
| --- | --- |
| `GET /api/convert?url=…&target=mihomo` | 转换一条或多条订阅 |
| `GET /api/share/:id` | 解析加密短链 |
| `POST /api/short` | 创建加密短链 |
| `GET /api/qrcode?text=…` | 生成 SVG 二维码 |
| `GET /api/version` | 版本与支持格式 |

完整参数表(节点集、策略、规则预设、过滤重命名等)见 [使用说明](USAGE.zh-CN.md)。

## 安全设计

- 前端不接触订阅内容——转换全部发生在 Worker
- 短链负载用只有你的 Worker 持有的密钥做 AES-256-GCM 加密
- 可选 `API_TOKEN` 访问令牌保护转换端点(恒定时间比较)
- 内置每 IP 限流与 CORS 来源白名单
- 网页零历史记录,刷新即无痕

## 本地开发

```bash
pnpm install
pnpm dev            # 前端 :5173(/api 代理到 :8787)+ Worker :8787
pnpm test           # vitest
pnpm typecheck      # 全仓库严格 TS
pnpm lint           # biome
pnpm build          # 构建全部应用
```

## 开源协议

[MIT](LICENSE) —— 欢迎 Fork、自建、二次开发。
