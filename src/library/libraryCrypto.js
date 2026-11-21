// ── Cloud library encryption (Web Crypto only) ───────────────────────────────
// Everything Lantern puts in the cloud library is encrypted here first.
//
//   passphrase ──PBKDF2-SHA256──▶ wrapping key ──AES-GCM──▶ wrapped secret (server)
//   library secret (32 random bytes) ──HKDF──▶ file key (AES-GCM)
//                                         └──▶ dedupe key (HMAC-SHA256)
//
// Files are split into CHUNK_SIZE chunks. Each chunk is iv(12) || AES-GCM
// ciphertext, with additional data "<itemId>:<index>:<count>" so a chunk can't
// be moved to another file, reordered, or the file silently truncated.
// The derived keys are non-extractable; only the wrapped secret leaves the device.

export const CHUNK_SIZE = 8 * 1024 * 1024
export const PBKDF2_ITERATIONS = 600_000
const IV_BYTES = 12
const enc = new TextEncoder()
const dec = new TextDecoder()

const subtle = () => {
  const s = globalThis.crypto?.subtle
  if (!s) throw new Error('This browser cannot encrypt (Web Crypto is unavailable). Use https or localhost.')
  return s
}

export function toB64(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000))
  return btoa(s)
}

export function fromB64(b64) {
  const s = atob(b64)
  const u8 = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i)
  return u8
}

const randomBytes = n => globalThis.crypto.getRandomValues(new Uint8Array(n))

async function wrappingKey(passphrase, salt, iterations) {
  const base = await subtle().importKey('raw', enc.encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveKey'])
  return subtle().deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

/** Derive the working keys from the 32-byte library secret. */
export async function keysFromSecret(secret) {
  const base = await subtle().importKey('raw', secret, 'HKDF', false, ['deriveKey'])
  const info = s => ({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: enc.encode(s) })
  const fileKey = await subtle().deriveKey(info('lantern-library/file/v1'), base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  const dedupeKey = await subtle().deriveKey(info('lantern-library/dedupe/v1'), base, { name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign'])
  return { fileKey, dedupeKey }
}

/**
 * New library: a random secret wrapped under the passphrase.
 * @returns {{ record: { kdf, iterations, salt, wrapped_key }, keys }}
 */
export async function createLibraryKey(passphrase, iterations = PBKDF2_ITERATIONS) {
  if (!passphrase || passphrase.length < 8) throw new Error('Use a passphrase of at least 8 characters.')
  const secret = randomBytes(32)
  const salt = randomBytes(16)
  const wk = await wrappingKey(passphrase, salt, iterations)
  const iv = randomBytes(IV_BYTES)
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode('lantern-library/key/v1') }, wk, secret))
  const wrapped = new Uint8Array(IV_BYTES + ct.length)
  wrapped.set(iv); wrapped.set(ct, IV_BYTES)
  const keys = await keysFromSecret(secret)
  secret.fill(0)
  return { record: { kdf: 'PBKDF2-SHA256', iterations, salt: toB64(salt), wrapped_key: toB64(wrapped) }, keys }
}

/** Unlock with the passphrase. Throws WrongPassphraseError when it doesn't match. */
export async function unlockLibraryKey(passphrase, record) {
  const wk = await wrappingKey(passphrase, fromB64(record.salt), record.iterations)
  const wrapped = fromB64(record.wrapped_key)
  let secret
  try {
    secret = new Uint8Array(await subtle().decrypt(
      { name: 'AES-GCM', iv: wrapped.subarray(0, IV_BYTES), additionalData: enc.encode('lantern-library/key/v1') },
      wk, wrapped.subarray(IV_BYTES)))
  } catch {
    throw new WrongPassphraseError()
  }
  const keys = await keysFromSecret(secret)
  secret.fill(0)
  return keys
}

export class WrongPassphraseError extends Error {
  constructor() { super('That passphrase doesn’t unlock your library.'); this.name = 'WrongPassphraseError' }
}

const chunkAad = (itemId, index, count) => enc.encode(`${itemId}:${index}:${count}`)

export async function encryptChunk(fileKey, plain, itemId, index, count) {
  const iv = randomBytes(IV_BYTES)
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: chunkAad(itemId, index, count) }, fileKey, plain))
  const out = new Uint8Array(IV_BYTES + ct.length)
  out.set(iv); out.set(ct, IV_BYTES)
  return out
}

export async function decryptChunk(fileKey, data, itemId, index, count) {
  const u8 = data instanceof Uint8Array ? data : new Uint8Array(data)
  try {
    return new Uint8Array(await subtle().decrypt(
      { name: 'AES-GCM', iv: u8.subarray(0, IV_BYTES), additionalData: chunkAad(itemId, index, count) },
      fileKey, u8.subarray(IV_BYTES)))
  } catch {
    throw new Error(`Part ${index + 1} of this file is damaged or was changed. Nothing was imported.`)
  }
}

/** Small JSON values (item labels, presets), bound to a purpose string. */
export async function encryptJson(fileKey, value, purpose) {
  const iv = randomBytes(IV_BYTES)
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(purpose) }, fileKey, enc.encode(JSON.stringify(value))))
  const out = new Uint8Array(IV_BYTES + ct.length)
  out.set(iv); out.set(ct, IV_BYTES)
  return toB64(out)
}

export async function decryptJson(fileKey, b64, purpose) {
  const u8 = fromB64(b64)
  const plain = await subtle().decrypt({ name: 'AES-GCM', iv: u8.subarray(0, IV_BYTES), additionalData: enc.encode(purpose) }, fileKey, u8.subarray(IV_BYTES))
  return JSON.parse(dec.decode(plain))
}

/** Same kind + id → same key, so re-importing a file doesn't store it twice. */
export async function dedupeKeyFor(dedupeKey, kind, naturalId) {
  const mac = await subtle().sign('HMAC', dedupeKey, enc.encode(`${kind}:${naturalId}`))
  return toB64(new Uint8Array(mac)).replace(/=+$/, '')
}

export const chunkCount = bytes => Math.max(1, Math.ceil(bytes / CHUNK_SIZE))
