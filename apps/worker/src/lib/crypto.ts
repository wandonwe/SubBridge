/**
 * AES-256-GCM sealing for short-link payloads.
 *
 * The original subscription URL and conversion parameters are encrypted at
 * rest in KV, so neither a KV dump nor the short link itself ever reveals
 * the upstream subscription.
 */

const encoder = new TextEncoder()
const decoder = new TextDecoder()

async function deriveKey(secret: string): Promise<CryptoKey> {
  const material = await crypto.subtle.digest('SHA-256', encoder.encode(secret))
  return crypto.subtle.importKey('raw', material, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

export async function seal(secret: string, plaintext: string): Promise<string> {
  const key = await deriveKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext),
  )
  const packed = new Uint8Array(iv.length + ciphertext.byteLength)
  packed.set(iv)
  packed.set(new Uint8Array(ciphertext), iv.length)
  let binary = ''
  for (const byte of packed) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export async function unseal(secret: string, sealed: string): Promise<string | null> {
  try {
    const binary = atob(sealed)
    const packed = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) packed[i] = binary.charCodeAt(i)
    const key = await deriveKey(secret)
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: packed.slice(0, 12) },
      key,
      packed.slice(12),
    )
    return decoder.decode(plaintext)
  } catch {
    return null
  }
}
