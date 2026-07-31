import type { OutputFormat } from '@subbridge/core'

export interface FormatMeta {
  value: OutputFormat
  label: string
  hint: string
}

export const FORMATS: FormatMeta[] = [
  { value: 'mihomo', label: 'Mihomo (Clash Verge)', hint: 'YAML profile with groups & rules' },
  { value: 'singbox', label: 'Sing-box', hint: 'JSON config with rule sets' },
  { value: 'shadowrocket', label: 'Shadowrocket', hint: 'Base64 subscription' },
  { value: 'surge', label: 'Surge', hint: 'Surge 5 managed profile' },
  { value: 'quantumultx', label: 'Quantumult X', hint: 'Server snippet' },
  { value: 'base64', label: 'Base64', hint: 'Universal v2ray subscription' },
  { value: 'sharelink', label: 'Share Links', hint: 'Plain list of URIs' },
]

export const CLIENT_SCHEMES: Partial<Record<OutputFormat, (url: string) => string>> = {
  mihomo: (url) => `clash://install-config?url=${encodeURIComponent(url)}&name=SubBridge`,
  singbox: (url) => `sing-box://import-remote-profile?url=${encodeURIComponent(url)}#SubBridge`,
  shadowrocket: (url) =>
    `shadowrocket://add/sub://${btoa(url).replace(/=+$/, '')}?remark=SubBridge`,
  surge: (url) => `surge:///install-config?url=${encodeURIComponent(url)}`,
  quantumultx: (url) =>
    `quantumult-x:///add-resource?remote-resource=${encodeURIComponent(
      JSON.stringify({ server_remote: [`${url}, tag=SubBridge`] }),
    )}`,
}
