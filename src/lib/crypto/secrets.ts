/**
 * Owner-pasted credentials, encrypted before they reach a row.
 *
 * `channel_connections.token_ciphertext` holds a BotFather token or a Meta page
 * token: a credential that can send messages as the shop, which a shop owner
 * handed us on trust. `db/schema.sql` already specifies AES-256-GCM with the env
 * key `MONI_TOKEN_KEY`, and this is that.
 *
 * GCM and not CBC because it authenticates: a ciphertext altered in the database,
 * by anyone who reached the database, fails to decrypt instead of decrypting to
 * something else. The version prefix exists so the key can be rotated later
 * without guessing what an old row was encrypted with.
 */
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto'

const VERSION = 'v1'
const IV_BYTES = 12
const KEY_BYTES = 32

export class SecretKeyError extends Error {}

/**
 * 32 bytes, as base64 or hex. Generate one with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
export function tokenKey(raw = process.env.MONI_TOKEN_KEY): Buffer {
  const value = raw?.trim()
  if (!value) {
    throw new SecretKeyError(
      'MONI_TOKEN_KEY is not set. A channel token cannot be stored without it.',
    )
  }
  const decoded = /^[0-9a-f]{64}$/i.test(value)
    ? Buffer.from(value, 'hex')
    : Buffer.from(value, 'base64')
  if (decoded.length !== KEY_BYTES) {
    throw new SecretKeyError(`MONI_TOKEN_KEY must decode to ${KEY_BYTES} bytes, got ${decoded.length}`)
  }
  return decoded
}

export function encryptSecret(plaintext: string, key = tokenKey()): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString('base64'), body.toString('base64'), tag.toString('base64')].join('.')
}

export function decryptSecret(payload: string, key = tokenKey()): string {
  const [version, iv, body, tag] = payload.split('.')
  if (version !== VERSION || !iv || !body || !tag) {
    throw new SecretKeyError('stored credential is not in a format this build can read')
  }
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  // Throws on a tampered ciphertext or the wrong key, which is the point of GCM.
  return Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString('utf8')
}

/**
 * Webhook secrets are compared, not decrypted, so the comparison must not leak
 * the answer through its own duration.
 */
export function secretsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

/** URL-safe, 32 bytes of entropy. Telegram allows A-Z a-z 0-9 _ and - only. */
export function newWebhookSecret(): string {
  return randomBytes(32).toString('base64url')
}
