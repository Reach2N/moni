import { NextResponse } from 'next/server'
import type { Update } from 'grammy/types'
import { db } from '@/lib/db.ts'
import { isDatabaseConflict, throwIfDbError } from '@/lib/db-result.ts'
import type { Json } from '@/lib/database.types.ts'
import { decryptSecret, secretsMatch } from '@/lib/crypto/secrets.ts'
import { extractIncoming, sendReply } from '@/lib/channels/telegram.ts'
import { handleCustomerMessage, scopedExternalId } from '@/lib/agent/customer-loop.ts'
import { inboundMessageLimiter } from '@/lib/ops/rate-limit.ts'
import { getBusinessById } from '@/lib/queries/business.ts'

export const runtime = 'nodejs'
export const maxDuration = 60

const UNIQUE_VIOLATION = '23505'
const MAX_BODY_BYTES = 200_000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Telegram's inbound webhook, one URL per connection.
 *
 * Two things prove the caller: the connection id in the path says WHICH shop,
 * and Telegram's own `secret_token`, returned in the header below, says the call
 * really came from Telegram. The id alone would be a bearer token in a URL that
 * ends up in logs.
 *
 * This route answers 200 to almost everything on purpose. A non-2xx makes
 * Telegram redeliver, and redelivery is dangerous here: the agent can book. The
 * update is written to `webhook_events` first, so a redelivery is recognised as
 * a duplicate and answered without running the agent twice. The cost of that
 * choice is that a failed turn is not retried automatically, which is the right
 * trade when the alternative is two bookings for one customer.
 *
 * The customer's message is stored before the model runs, so even a total model
 * failure loses an answer and never a customer's words: the owner still sees the
 * message in the inbox.
 */
export async function POST(req: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  const { connectionId } = await params
  if (!UUID.test(connectionId)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  // The ONE place a non-2xx is the right answer. Nothing has been recorded yet,
  // so a redelivery cannot double-book, and if our database is unreachable we
  // want Telegram to try again rather than drop a customer's message.
  let connection
  try {
    const connectionResult = await db
      .from('channel_connections')
      .select('id, business_id, webhook_secret, token_ciphertext, status')
      .eq('id', connectionId)
      .eq('channel', 'telegram')
      .maybeSingle()
    throwIfDbError('load telegram connection', connectionResult.error)
    connection = connectionResult.data
  } catch (error) {
    console.error('[telegram] connection lookup failed:', error instanceof Error ? error.message : error)
    return NextResponse.json({ ok: false, retry: true }, { status: 503 })
  }

  // A wrong or missing secret is answered identically to an unknown connection,
  // and nothing is logged against a business, so this endpoint cannot be used to
  // discover which connection ids exist.
  const presented = req.headers.get('x-telegram-bot-api-secret-token')
  if (!connection || !secretsMatch(presented, connection.webhook_secret)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const raw = await req.text()
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, reason: 'payload too large' }, { status: 200 })
  }

  let update: Update
  try {
    update = JSON.parse(raw) as Update
  } catch {
    return NextResponse.json({ ok: false, reason: 'unreadable payload' }, { status: 200 })
  }

  const logged = await db
    .from('webhook_events')
    .insert({
      channel: 'telegram',
      connection_id: connection.id,
      business_id: connection.business_id,
      external_event_id: String(update.update_id),
      payload: update as unknown as Json,
    })
    .select('id')
    .single()

  if (isDatabaseConflict(logged.error, UNIQUE_VIOLATION)) {
    // Telegram redelivers when we answer slowly. The first delivery already
    // booked, or is still booking. Doing it again is the one unrecoverable bug.
    return NextResponse.json({ ok: true, duplicate: true })
  }
  throwIfDbError('log telegram update', logged.error)
  const eventId = logged.data!.id

  const settle = async (status: 'processed' | 'skipped' | 'failed', error?: string) => {
    const result = await db
      .from('webhook_events')
      .update({ status, error: error ?? null, processed_at: new Date().toISOString() })
      .eq('id', eventId)
    if (result.error) console.error('[telegram] event not settled:', result.error.message)
  }

  try {
    const incoming = extractIncoming(update)
    if (!incoming) {
      // Edits, joins, stickers, photos. Recorded, not acted on.
      await settle('skipped')
      return NextResponse.json({ ok: true, skipped: true })
    }
    if (!connection.token_ciphertext) {
      await settle('failed', 'connection has no token')
      return NextResponse.json({ ok: false })
    }

    // Per chat id, per shop. One customer sending more than twenty messages a
    // minute is not a customer. Recorded as skipped rather than failed: nothing
    // went wrong, we simply declined to do the work. PLAN.md Phase 9.
    const rate = inboundMessageLimiter.check(`telegram:${connection.id}:${incoming.fromId}`)
    if (!rate.allowed) {
      await settle('skipped', `rate limited, retry in ${rate.retryAfterSeconds}s`)
      return NextResponse.json({ ok: true, rate_limited: true })
    }

    const business = await getBusinessById(connection.business_id)
    const turn = await handleCustomerMessage({
      business,
      channel: 'telegram',
      externalId: scopedExternalId(business.id, incoming.fromId),
      displayName: incoming.displayName,
      text: incoming.text,
    })

    if (turn.text) {
      await sendReply(decryptSecret(connection.token_ciphertext), incoming.chatId, turn.text)
    }

    await settle('processed')
    return NextResponse.json({ ok: true, handed_over: turn.handedOver })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'telegram update failed'
    console.error('[telegram]', message)
    await settle('failed', message.slice(0, 500))
    // Still 200. The update is on record and a redelivery would be refused as a
    // duplicate anyway, so a 500 would only make Telegram try for hours.
    return NextResponse.json({ ok: false })
  }
}
