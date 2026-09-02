/**
 * Facebook Messenger, the Meta Messenger Platform.
 *
 * Messenger is the larger channel in Cambodia and it is second, not first,
 * because Meta requires app review before a page can message the public. That is
 * weeks, so Telegram carries the demo and this runs in dev mode for admins and
 * test users meanwhile, honestly labelled.
 *
 * Three things differ from Telegram and all three are easy to get wrong:
 *
 * 1. There is ONE webhook URL for the whole Meta app, not one per connection, so
 *    the shop is resolved from the page id inside the payload rather than from
 *    the path.
 * 2. Meta verifies the endpoint with a GET carrying `hub.challenge`, which must
 *    be echoed back as plain text or the subscription is never created.
 * 3. Deliveries are signed with an HMAC over the RAW body. Re-serialising parsed
 *    JSON changes the bytes and the signature never matches, which is the bug
 *    that costs an afternoon.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

const GRAPH = 'https://graph.facebook.com/v21.0'

export class MessengerError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'MessengerError'
    this.status = status
  }
}

/**
 * Meta signs the raw request body with the APP secret, not the page token, so
 * one secret verifies every page. Compared in constant time, and the length is
 * checked first because timingSafeEqual throws on a mismatch.
 */
export function verifySignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith('sha256=')) return false
  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')
  const presented = header.slice('sha256='.length)
  if (presented.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(presented, 'utf8'), Buffer.from(expected, 'utf8'))
}

export type MessengerIncoming = {
  pageId: string
  senderId: string
  /** Meta's own message id. The dedupe key: Meta redelivers on a slow response. */
  messageId: string
  text: string
}

/**
 * Everything this product acts on, flattened out of Meta's nested envelope.
 *
 * `is_echo` matters: a page's own outgoing messages come back through the same
 * webhook, so without this check the assistant answers itself, forever.
 */
export function extractMessengerMessages(payload: unknown): MessengerIncoming[] {
  const body = payload as {
    object?: string
    entry?: Array<{
      id?: string
      messaging?: Array<{
        sender?: { id?: string }
        message?: { mid?: string; text?: string; is_echo?: boolean }
      }>
    }>
  }
  if (body?.object !== 'page' || !Array.isArray(body.entry)) return []

  const out: MessengerIncoming[] = []
  for (const entry of body.entry) {
    const pageId = entry?.id
    if (!pageId) continue
    for (const event of entry.messaging ?? []) {
      const text = event.message?.text
      const senderId = event.sender?.id
      const messageId = event.message?.mid
      if (!text || !senderId || !messageId) continue
      if (event.message?.is_echo) continue
      if (senderId === pageId) continue
      out.push({ pageId, senderId, messageId, text })
    }
  }
  return out
}

/** Proves the page token works and names the page, before anything is stored. */
export async function verifyPageToken(pageToken: string) {
  const response = await fetch(`${GRAPH}/me?fields=id,name&access_token=${encodeURIComponent(pageToken)}`)
  const body = (await response.json().catch(() => null)) as { id?: string; name?: string; error?: { message?: string } } | null
  if (!response.ok || !body?.id) {
    throw new MessengerError(400, body?.error?.message ?? 'Meta would not accept that page token')
  }
  return { externalId: body.id, displayName: body.name ?? `Page ${body.id}` }
}

/**
 * Subscribes the page to the app's webhook. Without this the app is configured
 * and no message ever arrives, which presents as a webhook that "does not work".
 */
export async function subscribePage(pageToken: string) {
  const response = await fetch(`${GRAPH}/me/subscribed_apps`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      subscribed_fields: ['messages', 'messaging_postbacks'],
      access_token: pageToken,
    }),
  })
  const body = (await response.json().catch(() => null)) as { success?: boolean; error?: { message?: string } } | null
  if (!response.ok || body?.success !== true) {
    throw new MessengerError(502, body?.error?.message ?? 'the page could not be subscribed to the app')
  }
}

export async function unsubscribePage(pageToken: string) {
  await fetch(`${GRAPH}/me/subscribed_apps?access_token=${encodeURIComponent(pageToken)}`, { method: 'DELETE' })
}

/** Messenger caps a text message at 2000 characters. */
export const MESSENGER_MAX_MESSAGE = 2_000

/**
 * An image by URL. Meta fetches it, so the address must be public HTTPS: the
 * caller checks that and falls back to text when it is not (a laptop cannot
 * hand Meta a localhost URL and expect a picture to arrive).
 */
export async function sendMessengerImage(pageToken: string, recipientId: string, url: string) {
  const response = await fetch(`${GRAPH}/me/messages?access_token=${encodeURIComponent(pageToken)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: 'RESPONSE',
      message: { attachment: { type: 'image', payload: { url, is_reusable: false } } },
    }),
  })
  if (!response.ok) {
    const failure = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
    throw new MessengerError(502, failure?.error?.message ?? 'the payment QR could not be delivered to Messenger')
  }
}

export async function sendMessengerReply(pageToken: string, recipientId: string, text: string) {
  const body = text.length > MESSENGER_MAX_MESSAGE ? `${text.slice(0, MESSENGER_MAX_MESSAGE - 1)}…` : text
  const response = await fetch(`${GRAPH}/me/messages?access_token=${encodeURIComponent(pageToken)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      // RESPONSE is the only tag allowed inside the standard messaging window.
      messaging_type: 'RESPONSE',
      message: { text: body },
    }),
  })
  if (!response.ok) {
    const failure = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
    throw new MessengerError(502, failure?.error?.message ?? 'the reply could not be delivered to Messenger')
  }
}
