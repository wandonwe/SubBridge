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

export interface SelectorGroup {
  name: string
  /** Option order mirrors the reference config — first entry is the default. */
  options: string[]
}

/** Scheduling selector groups, in reference display order. */
export const SELECTOR_GROUPS: SelectorGroup[] = [
  { name: 'Microsoft', options: ['DIRECT', MAIN_GROUP] },
  { name: 'OpenAI', options: ['DIRECT', MAIN_GROUP] },
  { name: 'Claude', options: ['DIRECT', MAIN_GROUP] },
  { name: 'Media', options: ['DIRECT', MAIN_GROUP] },
  { name: 'Guard', options: ['DIRECT', 'REJECT', 'REJECT-DROP'] },
  { name: FINAL_GROUP, options: ['DIRECT', MAIN_GROUP] },
]

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
