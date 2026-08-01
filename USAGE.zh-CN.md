# SubBridge 使用说明 —— 订阅转换

[English](USAGE.md) · **简体中文** — 部署说明见 [DEPLOY.zh-CN.md](DEPLOY.zh-CN.md)

本文说明转换器的输入写法和输出结果。

## 快速上手

1. 打开你的 SubBridge 网站。
2. 把订阅链接粘贴进 **Subscription URL** 输入框。
3. 选择**输出格式**,可顺手填一个**配置名称**。
4. 点 **Generate Subscription**,然后复制链接 / 扫二维码 / 点"Open in client"一键导入。

生成的链接是一个实时转换地址——客户端每次更新订阅都会重新拉取,
所以它永远反映上游订阅的最新状态。

## 输入:可以粘贴什么

支持的上游格式(自动识别):

- Clash / Mihomo YAML 订阅(Hiddify 和大多数机场面板的格式)
- 经典 Base64 订阅(v2ray 风格)
- 纯分享链接:`ss://` `vmess://` `vless://` `trojan://`
  `hysteria2://`(`hy2://`)`tuic://`

### 一行一条订阅

```text
https://example.com/sub
```

多行会按顺序**合并**为一份输出。

### 命名节点集

在行首加名字,该订阅的节点会保留为独立的可选分组:

```text
Prime https://example.com/sub-a
Backup https://example.com/sub-b
```

客户端里会出现 `Prime` 和 `Backup` 两个组;每个策略组(OpenAI、Media 等)
都可以单独指定走某个集。名为 `Backup` 的集会自动成为 OpenAI 策略的默认选项。

### 每个集的调度策略

在名字后面加 `,auto` 或 `,fallback`:

```text
Prime,auto https://example.com/sub-a        ← 自动测速:选最快节点
Backup,fallback https://example.com/sub-b   ← 故障转移:选第一个健康节点
Other https://example.com/sub-c             ← 手动选择(默认)
```

集的图标会跟随策略变化(⚡ 自动测速 / 🧯 故障转移 / ✓ 手动选择)。

### 内置节点池

每份配置还自带两个全局池,可在 `Proxy` 组里选择:

- **AUTO** —— 对*全部*节点自动测速(空闲不测,省电省流量)
- **FALLBACK** —— 按集顺序故障转移(Prime 挂了自动切 Backup)

## 输出格式

| 格式 | 说明 |
| --- | --- |
| Mihomo (Clash Verge) | 完整 YAML 配置,含策略组和分流规则 |
| Sing-box | JSON 配置,含规则集 + Clash API(可用 metacubexd 面板) |
| Shadowrocket | Base64 订阅 |
| Surge | Surge 5 托管配置(vless 节点会被跳过——Surge 不支持) |
| Quantumult X | 服务器片段(仅节点,无规则) |
| Base64 | 通用 v2ray 风格订阅 |
| Share Links | 纯分享链接列表 |

## 规则集预设

在 **Advanced options → Rule set** 里选择(API 参数为 `rules=`):

| 预设 | 内容 |
| --- | --- |
| **Default(默认)** | 均衡策略:Apple、广告→Guard、OpenAI、Claude、GitHub、Microsoft、YouTube、Google、Telegram、Netflix、Spotify、TikTok、国内直连、海外代理 |
| **Full(详细)** | 默认基础上**追加** Gemini、Disney+、Prime Video、Games 游戏组(默认直连)和 Telegram IP 段(no-resolve) |
| **Lite(极简)** | 最小最快:仅广告 / 国内 / 海外三组——适合路由器和低配设备 |
| **None(无)** | 不带规则,全部流量走 Proxy |

所有规则集均为二进制格式(mrs / srs),匹配速度快,客户端每日自动更新。

## 高级选项

| 选项 | 作用 |
| --- | --- |
| Include nodes(正则) | 仅保留名称匹配的节点,如 `HK\|SG\|JP` |
| Exclude nodes(正则) | 剔除匹配的节点,如 `到期\|流量` |
| Rename rules | 每行一条 `查找->替换`,支持正则,如 `香港->HK` |
| Name prefix | 给所有节点名加前缀 |
| Deduplicate nodes | 去除服务器端点重复的节点 |
| Sort by name | 节点按名称排序 |
| Auto url-test group | 开关 AUTO / FALLBACK 节点池 |

## API(供脚本和客户端直接调用)

网页上的所有功能都对应 `GET /api/convert`:

```text
https://<你的API>/api/convert
  ?url=<订阅链接>                  # 可重复;按顺序合并
  &group=Prime,auto                # 可选,与 url 一一对应;名称[,auto|fallback]
  &group=Backup,fallback
  &target=mihomo                   # mihomo | singbox | shadowrocket | surge
                                   # | quantumultx | base64 | sharelink
  &filename=我的节点               # 客户端显示的配置名(支持中文)
  &rules=full                      # lite | default | full | none
  &include=HK|SG &exclude=到期
  &rename=香港->HK &prefix=[SB]%20
  &dedupe=1 &sort=1 &urltest=0
  &ua=<自定义上游 User-Agent>
  &token=<如果实例设置了访问令牌>
```

其他端点:`POST /api/short`(加密短链)、`GET /api/share/:id`、
`GET /api/qrcode?text=…`、`GET /api/version`。

## 隐私

- 转换在你自己的 Cloudflare Worker 上完成,不记录、不存储任何内容。
- 网页端**没有历史记录**——生成的链接刷新即消失。
- 短链采用 AES-256-GCM 加密,即使 KV 数据被导出也无法还原原始订阅。
