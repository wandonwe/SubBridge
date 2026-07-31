/**
 * Base URL of the SubBridge API.
 *
 * In production the deploy workflow injects `VITE_API_BASE` (the Worker's
 * own domain, e.g. https://subbridge-api.<sub>.workers.dev or a custom API
 * host), so generated subscription links point straight at the Worker and
 * never depend on Pages proxying — which Cloudflare Pages does not support
 * for external hosts.
 *
 * In development it's empty, so requests stay same-origin and Vite's dev
 * proxy forwards `/api` to the local `wrangler dev` on :8787.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

/** Absolute URL for an API path, honouring the configured base. */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`
}

/** Origin used to build user-facing subscription URLs. */
export function apiOrigin(): string {
  return API_BASE || window.location.origin
}
