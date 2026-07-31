import type { ConvertOptions, OutputFormat, Subscription } from '@subbridge/core'
import { toMihomo } from './mihomo'
import { applyPipeline } from './pipeline'
import { toQuantumultX } from './quantumultx'
import { toBase64Subscription, toShareLinks } from './sharelink'
import { toSingbox } from './singbox'
import { toSurge } from './surge'

export { toMihomo, toMihomoProxy } from './mihomo'
export { applyPipeline } from './pipeline'
export * from './policy'
export { toQuantumultX } from './quantumultx'
export { toBase64Subscription, toShareLink, toShareLinks } from './sharelink'
export { toSingbox, toSingboxOutbound } from './singbox'
export { toSurge } from './surge'

export interface ConvertResult {
  content: string
  contentType: string
  /** Suggested download filename. */
  filename: string
}

/** Convert a parsed subscription into the requested client format. */
export function convert(
  subscription: Subscription,
  format: OutputFormat,
  options: ConvertOptions = {},
): ConvertResult {
  const nodes = applyPipeline(subscription.nodes, options)

  switch (format) {
    case 'mihomo':
      return {
        content: toMihomo(nodes, options),
        contentType: 'text/yaml; charset=utf-8',
        filename: 'subbridge.yaml',
      }
    case 'singbox':
      return {
        content: toSingbox(nodes, options),
        contentType: 'application/json; charset=utf-8',
        filename: 'subbridge.json',
      }
    case 'surge':
      return {
        content: toSurge(nodes, options),
        contentType: 'text/plain; charset=utf-8',
        filename: 'subbridge.conf',
      }
    case 'quantumultx':
      return {
        content: toQuantumultX(nodes, options),
        contentType: 'text/plain; charset=utf-8',
        filename: 'subbridge.snippet',
      }
    case 'shadowrocket':
    case 'base64':
      return {
        content: toBase64Subscription(nodes),
        contentType: 'text/plain; charset=utf-8',
        filename: 'subbridge.txt',
      }
    case 'sharelink':
      return {
        content: toShareLinks(nodes),
        contentType: 'text/plain; charset=utf-8',
        filename: 'subbridge-links.txt',
      }
  }
}
