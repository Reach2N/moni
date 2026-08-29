import 'server-only'
import { db } from '../db.ts'
import { throwIfDbError } from '../db-result.ts'
import { decryptSecret } from '../crypto/secrets.ts'
import { sendReply } from './telegram.ts'
import { sendMessengerReply } from './messenger.ts'

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
