/**
 * Canonical, protocol-agnostic node model.
 *
 * Every input format is parsed into `ProxyNode[]` and every output format is
 * rendered from `ProxyNode[]`. This is the single source of truth that keeps
 * parser and converter fully decoupled.
 */

export type ProxyProtocol = 'ss' | 'vmess' | 'vless' | 'trojan' | 'hysteria2' | 'tuic'

export type TransportType = 'tcp' | 'ws' | 'grpc' | 'http' | 'h2' | 'httpupgrade'

export interface RealityOptions {
  publicKey: string
  shortId?: string
}

export interface TlsOptions {
  enabled: boolean
  serverName?: string
  alpn?: string[]
  insecure?: boolean
  /** uTLS client-hello fingerprint, e.g. `chrome` */
  fingerprint?: string
  reality?: RealityOptions
}

export interface TransportOptions {
  type: TransportType
  /** WebSocket / HTTP path */
  path?: string
  /** Host header / ws host */
  host?: string
  /** gRPC service name */
  serviceName?: string
  headers?: Record<string, string>
}

interface BaseNode {
  name: string
  server: string
  port: number
  udp?: boolean
  tls?: TlsOptions
  transport?: TransportOptions
  /** Named node set this node belongs to (e.g. "Prime", "Backup"). */
  group?: string
}

export interface ShadowsocksNode extends BaseNode {
  protocol: 'ss'
  method: string
  password: string
  plugin?: string
  pluginOpts?: string
}

export interface VmessNode extends BaseNode {
  protocol: 'vmess'
  uuid: string
  alterId: number
  security: string
}

export interface VlessNode extends BaseNode {
  protocol: 'vless'
  uuid: string
  flow?: string
}

export interface TrojanNode extends BaseNode {
  protocol: 'trojan'
  password: string
}

export interface Hysteria2Node extends BaseNode {
  protocol: 'hysteria2'
  password: string
  obfs?: string
  obfsPassword?: string
  upMbps?: number
  downMbps?: number
}

export interface TuicNode extends BaseNode {
  protocol: 'tuic'
  uuid: string
  password: string
  congestionControl?: string
  udpRelayMode?: string
}

export type ProxyNode =
  | ShadowsocksNode
  | VmessNode
  | VlessNode
  | TrojanNode
  | Hysteria2Node
  | TuicNode

/** Subscription-level metadata carried through from upstream responses. */
export interface SubscriptionInfo {
  upload?: number
  download?: number
  total?: number
  /** Unix seconds */
  expire?: number
}

export interface Subscription {
  nodes: ProxyNode[]
  info?: SubscriptionInfo
  /** Original subscription title if the upstream provided one. */
  title?: string
}

/** Scheduling strategy of a named node set. */
export type SetStrategy = 'select' | 'auto' | 'fallback'

export const SET_STRATEGIES: readonly SetStrategy[] = ['select', 'auto', 'fallback'] as const

export function isSetStrategy(value: string): value is SetStrategy {
  return (SET_STRATEGIES as readonly string[]).includes(value)
}

export type OutputFormat =
  | 'mihomo'
  | 'singbox'
  | 'shadowrocket'
  | 'surge'
  | 'quantumultx'
  | 'base64'
  | 'sharelink'

export interface ConvertOptions {
  /** Regex applied to node names; non-matching nodes are dropped. */
  include?: string
  /** Regex applied to node names; matching nodes are dropped. */
  exclude?: string
  /** Rename rules, `search->replace`, applied in order. Search side is a regex. */
  rename?: string[]
  /**
   * Named node sets, parallel to the subscription URL list. When present,
   * each subscription's nodes are kept in their own selectable set
   * (e.g. `['Prime', 'Backup']`) instead of being pooled together.
   */
  groups?: string[]
  /**
   * Scheduling strategy per set name: `select` (manual, default), `auto`
   * (url-test picks the fastest member) or `fallback` (first healthy member).
   */
  setStrategies?: Record<string, SetStrategy>
  /** Prefix prepended to every node name. */
  prefix?: string
  /** Deduplicate nodes that resolve to the same endpoint. */
  dedupe?: boolean
  /** Sort nodes alphabetically by name. */
  sort?: boolean
  /** Emit url-test / auto-select groups (mihomo, sing-box, surge). */
  urlTest?: boolean
  /** URL used by health-check groups. */
  testUrl?: string
  /**
   * Rule-set preset:
   *  - `default` — the Matrix policy (balanced, recommended)
   *  - `full`    — default plus detailed extras (Gemini, Disney+, Prime
   *                Video, games, Telegram IP ranges)
   *  - `lite`    — minimal fast set (ads / cn / global only)
   *  - `none`    — MATCH only
   */
  rules?: 'lite' | 'default' | 'full' | 'none'
  /** User-Agent to send upstream when fetching subscriptions. */
  userAgent?: string
}

export const OUTPUT_FORMATS: readonly OutputFormat[] = [
  'mihomo',
  'singbox',
  'shadowrocket',
  'surge',
  'quantumultx',
  'base64',
  'sharelink',
] as const

export function isOutputFormat(value: string): value is OutputFormat {
  return (OUTPUT_FORMATS as readonly string[]).includes(value)
}
