/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute base URL of the SubBridge API (empty in dev). */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
