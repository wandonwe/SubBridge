export interface Env {
  SUBBRIDGE_KV: KVNamespace
  CORS_ORIGINS: string
  RATE_LIMIT_PER_MINUTE: string
  UPSTREAM_CACHE_TTL: string
  /** Secret: AES-GCM key material for encrypted short links. */
  SECRET?: string
  /** Secret: optional API token gate for convert/short endpoints. */
  API_TOKEN?: string
}

export type AppContext = {
  Bindings: Env
}
