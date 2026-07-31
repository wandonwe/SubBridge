/**
 * UTF-8 safe base64 helpers that work in every runtime SubBridge targets:
 * Cloudflare Workers, browsers and Node — no Buffer, no DOM assumptions
 * beyond `atob`/`btoa` which all three provide.
 */

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** Encode arbitrary UTF-8 text to standard base64. */
export function b64encode(text: string): string {
  const bytes = encoder.encode(text)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/** Decode standard or url-safe base64 (padding optional) to UTF-8 text. */
export function b64decode(input: string): string {
  const normalized = normalizeB64(input)
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return decoder.decode(bytes)
}

/** Encode to url-safe base64 without padding. */
export function b64encodeUrl(text: string): string {
  return b64encode(text).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

/** Best-effort decode: returns `null` instead of throwing on invalid input. */
export function tryB64decode(input: string): string | null {
  try {
    return b64decode(input)
  } catch {
    return null
  }
}

/**
 * Heuristic: does this string look like a base64 payload (as opposed to
 * plain text such as YAML or a list of URIs)?
 */
export function looksLikeB64(input: string): boolean {
  const trimmed = input.trim()
  if (trimmed.length < 4) return false
  return /^[A-Za-z0-9+/\-_]+={0,2}$/.test(trimmed.replace(/\s+/g, ''))
}

function normalizeB64(input: string): string {
  let s = input.replace(/\s+/g, '').replaceAll('-', '+').replaceAll('_', '/')
  const rem = s.length % 4
  if (rem === 2) s += '=='
  else if (rem === 3) s += '='
  else if (rem === 1) throw new Error('invalid base64 length')
  return s
}
