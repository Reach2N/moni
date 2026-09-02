import 'server-only'
import { db } from '../db.ts'
import { throwIfDbError } from '../db-result.ts'
import { decryptSecret } from '../crypto/secrets.ts'
import { renderKhqrPng } from '../khqr/qr-png.ts'
import { formatMoney, type CurrencyCode } from '../types.ts'
import { sendPhoto, sendReply } from './telegram.ts'
import { sendMessengerImage, sendMessengerReply } from './messenger.ts'

/**
 * Getting a message back to a customer, whatever channel they used.
 *
 * The inbox lets an owner type a reply into a Telegram thread, so delivery had
 * to stop being something only the webhook could do. One function, one place to
 * add Messenger in Phase 6, and one honest answer ("web" has no push, the
 * browser polls) rather than a silent success.
 */
export type Delivery = { delivered: boolean; reason?: string }

/**
 * A private chat's id is the user's own id, and `customer_identities.external_id`
 * is `<business id>:<channel user id>`, so the address is already stored. No
 * separate chat id column, and no way to address a customer of another shop.
 */
function channelUserId(externalId: string): string | null {
  const separator = externalId.indexOf(':')
  return separator === -1 ? null : externalId.slice(separator + 1)
}

async function identityFor(businessId: string, customerId: string, channel: string) {
  const scoped = await db
    .from('customers')
    .select('id')
    .eq('id', customerId)
    .eq('business_id', businessId)
    .maybeSingle()
  throwIfDbError('scope customer for delivery', scoped.error)
  if (!scoped.data) return null

  const identity = await db
    .from('customer_identities')
    .select('external_id')
    .eq('customer_id', customerId)
    .eq('channel', channel)
    .maybeSingle()
  throwIfDbError('load delivery identity', identity.error)
  return identity.data?.external_id ?? null
}

async function connectionToken(businessId: string, channel: string) {
  const result = await db
    .from('channel_connections')
    .select('token_ciphertext, status')
    .eq('business_id', businessId)
    .eq('channel', channel)
    .maybeSingle()
  throwIfDbError('load channel token', result.error)
  if (!result.data?.token_ciphertext) return null
  return decryptSecret(result.data.token_ciphertext)
}

export async function deliverToCustomer({
  businessId,
  customerId,
  channel,
  text,
}: {
  businessId: string
  customerId: string
  channel: string
  text: string
}): Promise<Delivery> {
  if (channel === 'web') {
    // Nothing to push to. The browser reads the transcript, so the message is
    // already delivered by being stored. Saying so beats pretending otherwise.
    return { delivered: true }
  }
  if (channel !== 'telegram' && channel !== 'messenger') {
    return { delivered: false, reason: `${channel} cannot be replied to yet` }
  }

  const externalId = await identityFor(businessId, customerId, channel)
  const chatId = externalId ? channelUserId(externalId) : null
  if (!chatId) return { delivered: false, reason: 'this customer has no address on that channel' }

  const token = await connectionToken(businessId, channel)
  if (!token) return { delivered: false, reason: `${channel} is not connected` }

  if (channel === 'telegram') {
    await sendReply(token, Number(chatId), text)
  } else {
    await sendMessengerReply(token, chatId, text)
  }
  return { delivered: true }
}

/** Where this deployment answers, if that address is one Meta can fetch from. */
function publicHttpsBase(): string | null {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  return base?.startsWith('https://') ? base : null
}

/**
 * The QR itself, to the customer, as a picture.
 *
 * `create_payment` stores the payload and tells the model the card is on its
 * way. This is that promise kept. It looks the payment up by the booking code
 * the tool returned, scoped to the shop, and sends the code as an image with
 * the amount and the shop in the caption: a customer standing in a market with
 * a banking app open needs something to point the camera at, not a description.
 *
 * Best effort by design. The booking already exists and the text reply already
 * went; a failure here is logged and reported, never thrown into the webhook,
 * because the alternative is Telegram redelivering a turn that already booked.
 */
export async function deliverPaymentCard({
  businessId,
  customerId,
  channel,
  code,
}: {
  businessId: string
  customerId: string
  channel: string
  code: string
}): Promise<Delivery> {
  if (channel === 'web') return { delivered: true } // the browser draws /api/pay/{code} itself
  if (channel !== 'telegram' && channel !== 'messenger') {
    return { delivered: false, reason: `${channel} cannot receive a QR yet` }
  }

  const bookingResult = await db
    .from('bookings')
    .select('id, code, businesses(name)')
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .eq('code', code.toUpperCase())
    .maybeSingle()
  throwIfDbError('load booking for QR delivery', bookingResult.error)
  const booking = bookingResult.data
  if (!booking) return { delivered: false, reason: 'no such booking for this customer' }

  const paymentResult = await db
    .from('payments')
    .select('qr_payload, amount_minor, currency')
    .eq('business_id', businessId)
    .eq('booking_id', booking.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  throwIfDbError('load payment for QR delivery', paymentResult.error)
  const payment = paymentResult.data
  if (!payment?.qr_payload) return { delivered: false, reason: 'no pending QR for that booking' }

  const externalId = await identityFor(businessId, customerId, channel)
  const chatId = externalId ? channelUserId(externalId) : null
  if (!chatId) return { delivered: false, reason: 'this customer has no address on that channel' }
  const token = await connectionToken(businessId, channel)
  if (!token) return { delivered: false, reason: `${channel} is not connected` }

  const amount = formatMoney(payment.amount_minor, payment.currency as CurrencyCode)
  const caption = `${booking.businesses?.name ?? ''}\n${amount} · លេខកូដ ${booking.code}\nស្កេនក្នុងកម្មវិធីធនាគាររបស់អ្នកក្នុងរយៈពេល ៥ នាទី។ ហាងនឹងបញ្ជាក់ពេលទទួលបានប្រាក់។`

  if (channel === 'telegram') {
    await sendPhoto(token, Number(chatId), await renderKhqrPng(payment.qr_payload), caption)
    return { delivered: true }
  }

  const base = publicHttpsBase()
  if (!base) {
    // Meta cannot fetch a picture from a laptop. The customer still gets the
    // amount and the code, and the honest reason is reported to the caller.
    await sendMessengerReply(token, chatId, caption)
    return { delivered: false, reason: 'NEXT_PUBLIC_APP_URL is not public https, so Messenger got text instead of the QR' }
  }
  await sendMessengerImage(token, chatId, `${base}/api/pay/${booking.code}?format=png`)
  await sendMessengerReply(token, chatId, caption)
  return { delivered: true }
}

/** The booking codes a turn produced QRs for, from the tool calls the loop recorded. */
export function paymentCodesIn(toolCalls: ReadonlyArray<{ tool: string; args: unknown }>): string[] {
  const codes: string[] = []
  for (const call of toolCalls) {
    if (call.tool !== 'create_payment') continue
    const code = (call.args as { code?: unknown } | null)?.code
    if (typeof code === 'string' && code.trim()) codes.push(code.trim().toUpperCase())
  }
  return [...new Set(codes)]
}
