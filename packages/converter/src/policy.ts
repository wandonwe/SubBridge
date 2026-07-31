/**
 * Unified routing policy, mirrored from `Config/Matrix.surgeconfig`.
 *
 * Every rule-capable output format (Mihomo, Sing-box, Surge) renders the SAME
 * policy groups and the SAME rule table, each with format-appropriate rule
 * sources: blackmatrix7 Surge lists for Surge, MetaCubeX geosite mrs for
 * Mihomo, MetaCubeX srs for Sing-box.
 */

/** The main outbound group every policy ultimately points at. */
export const MAIN_GROUP = 'Proxy'
export const AUTO_GROUP = 'AUTO'
export const FINAL_GROUP = 'Final'

const QURE = 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color'
const LOBE = 'https://unpkg.com/@lobehub/icons-static-png@latest/light'

/** Icon for named node-set groups (matches the reference Backup group). */
export const SET_ICON = `${QURE}/Available.png`

export const GROUP_ICONS: Record<string, string> = {
  Proxy: `${QURE}/Global.png`,
  Microsoft: `${LOBE}/microsoft-color.png`,
  OpenAI: `${QURE}/ChatGPT.png`,
  Claude: `${LOBE}/claude-color.png`,
  Download: `${QURE}/Download.png`,
  Media: `${QURE}/ForeignMedia.png`,
  Guard: `${QURE}/Advertising.png`,
  Final: `${QURE}/Final.png`,
  AUTO: `${QURE}/Auto.png`,
}

/**
 * Sentinel default: resolves to the node set named "Backup" when one exists,
 * otherwise falls back to the main Proxy group.
 */
export const BACKUP_SET = '@backup-set'

export interface SelectorGroup {
  name: string
  /** Base options; named node sets are inserted right after the Proxy entry. */
  options: string[]
  /** Default selection (rendered first — Surge/Mihomo treat first as default). */
  defaultOption: string
}

/**
 * Scheduling selector groups in reference display order, with the default
 * selections taken from the user's live panel: Microsoft/Download → DIRECT,
 * OpenAI → Backup set, Claude/Media/Final → Proxy, Guard → REJECT.
 */
export const SELECTOR_GROUPS: SelectorGroup[] = [
  { name: 'Microsoft', options: ['DIRECT', MAIN_GROUP], defaultOption: 'DIRECT' },
  { name: 'OpenAI', options: ['DIRECT', MAIN_GROUP], defaultOption: BACKUP_SET },
  { name: 'Claude', options: ['DIRECT', MAIN_GROUP], defaultOption: MAIN_GROUP },
  { name: 'Media', options: ['DIRECT', MAIN_GROUP], defaultOption: MAIN_GROUP },
  { name: 'Guard', options: ['DIRECT', 'REJECT', 'REJECT-DROP'], defaultOption: 'REJECT' },
  { name: FINAL_GROUP, options: ['DIRECT', MAIN_GROUP], defaultOption: MAIN_GROUP },
]

/**
 * Build a selector group's option list: splice the node-set names in after
 * Proxy, then move the resolved default to the front (first = default in
 * Surge and Mihomo; Sing-box reads it back explicitly).
 */
export function selectorOptions(group: SelectorGroup, setNames: string[]): string[] {
  const options = [...group.options]
  const at = options.indexOf(MAIN_GROUP)
  // Only proxy-capable groups gain the node sets (Guard stays DIRECT/REJECT).
  if (setNames.length > 0 && at !== -1) {
    options.splice(at + 1, 0, ...setNames)
  }
  let def = group.defaultOption
  if (def === BACKUP_SET) {
    def = setNames.find((n) => /backup/i.test(n)) ?? MAIN_GROUP
  }
  const idx = options.indexOf(def)
  if (idx > 0) {
    options.splice(idx, 1)
    options.unshift(def)
  }
  return options
}

/**
 * Group nodes by their named set, preserving set order of first appearance.
 * Empty result means "no sets" — render the classic pooled layout.
 */
export function collectSets(nodes: { name: string; group?: string }[]): Map<string, string[]> {
  const sets = new Map<string, string[]>()
  for (const node of nodes) {
    if (!node.group) continue
    const members = sets.get(node.group) ?? []
    members.push(node.name)
    sets.set(node.group, members)
  }
  return sets
}

export interface RuleEntry {
  /** Stable key, used as provider / rule-set tag. */
  key: string
  /** Target policy group (or DIRECT / Guard). */
  policy: string
  /** blackmatrix7 list path under rule/Surge/ (Surge output). */
  surgePath?: string
  /** MetaCubeX geosite name (Mihomo mrs + Sing-box srs outputs). */
  geosite?: string
}

const BM7 = 'https://cdn.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Surge'

/** Rule table in reference evaluation order. */
export const RULES: RuleEntry[] = [
  {
    key: 'apple',
    policy: 'DIRECT',
    surgePath: 'Apple/Apple_All_No_Resolve.list',
    geosite: 'apple',
  },
  { key: 'hijacking', policy: 'Guard', surgePath: 'Hijacking/Hijacking.list' },
  {
    key: 'ads',
    policy: 'Guard',
    surgePath: 'AdvertisingLite/AdvertisingLite_All_No_Resolve.list',
    geosite: 'category-ads-all',
  },
  { key: 'openai', policy: 'OpenAI', surgePath: 'OpenAI/OpenAI.list', geosite: 'openai' },
  { key: 'claude', policy: 'Claude', surgePath: 'Claude/Claude.list', geosite: 'anthropic' },
  { key: 'github', policy: MAIN_GROUP, surgePath: 'GitHub/GitHub.list', geosite: 'github' },
  {
    key: 'microsoft',
    policy: 'Microsoft',
    surgePath: 'Microsoft/Microsoft.list',
    geosite: 'microsoft',
  },
  { key: 'youtube', policy: 'Media', surgePath: 'YouTube/YouTube.list', geosite: 'youtube' },
  { key: 'google', policy: MAIN_GROUP, surgePath: 'Google/Google.list', geosite: 'google' },
  { key: 'telegram', policy: MAIN_GROUP, surgePath: 'Telegram/Telegram.list', geosite: 'telegram' },
  { key: 'netflix', policy: 'Media', surgePath: 'Netflix/Netflix.list', geosite: 'netflix' },
  { key: 'spotify', policy: 'Media', surgePath: 'Spotify/Spotify.list', geosite: 'spotify' },
  { key: 'tiktok', policy: 'Media', surgePath: 'TikTok/TikTok.list', geosite: 'tiktok' },
  { key: 'cn', policy: 'DIRECT', surgePath: 'China/China_All_No_Resolve.list', geosite: 'cn' },
  {
    key: 'global',
    policy: MAIN_GROUP,
    surgePath: 'Global/Global_All_No_Resolve.list',
    geosite: 'geolocation-!cn',
  },
]

export function surgeRuleUrl(path: string): string {
  return `${BM7}/${path}`
}

/** Reference connectivity endpoints. */
export const INTERNET_TEST_URL = 'http://connectivitycheck.platform.hicloud.com/generate_204'
export const PROXY_TEST_URL = 'http://clients3.google.com/generate_204'
