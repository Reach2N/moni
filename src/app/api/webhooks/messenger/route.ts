import { NextResponse } from 'next/server'
import { db } from '@/lib/db.ts'
import { isDatabaseConflict, throwIfDbError } from '@/lib/db-result.ts'
import type { Json } from '@/lib/database.types.ts'
import { decryptSecret, secretsMatch } from '@/lib/crypto/secrets.ts'
import { extractMessengerMessages, sendMessengerReply, verifySignature } from '@/lib/channels/messenger.ts'
import { handleCustomerMessage, scopedExternalId } from '@/lib/agent/customer-loop.ts'
import { getBusinessById } from '@/lib/queries/business.ts'

export const runtime = 'nodejs'
export const maxDuration = 60

const UNIQUE_VIOLATION = '23505'
const MAX_BODY_BYTES = 400_000

/**
 * Meta's subscription handshake.
 *
 * Meta calls this once with `hub.challenge` and expects the challenge echoed
 * back as PLAIN TEXT. Return JSON and the subscription is silently never
 * created, which presents as a webhook that "does not work".
 */
export function GET(req: Request) {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')
  const expected = process.env.META_VERIFY_TOKEN?.trim()

  if (mode === 'subscribe' && expected && secretsMatch(token, expected) && challenge) {
    return new Response(challenge, { status: 200, headers: { 'content-type': 'text/plain' } })
  }
  return new Response('not found', { status: 404 })
}

/**
 * Inbound Messenger messages.
 *
 * One URL for the whole Meta app, so the shop is resolved from the page id in
 * the payload, not from the path. Everything else matches the Telegram webhook
 * deliberately: log before the agent runs, dedupe on the provider's own message
 * id, and answer 200 so a redelivery cannot produce a second booking.
 *
 * The signature is computed over the RAW body. This route therefore reads text()
 * once and parses that same string, never re-serialising, because re-serialised
 * JSON is different bytes and the HMAC never matches.
 */
export async function POST(req: Request) {
  const appSecret = process.env.META_APP_SECRET?.trim()
  if (!appSecret) {
    console.error('[messenger] META_APP_SECRET is not set, refusing to trust a delivery')
    return NextResponse.json({ ok: false }, { status: 503 })
  }

  const raw = await req.text()
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, reason: 'payload too large' })
  }
  if (!verifySignature(raw, req.headers.get('x-hub-signature-256'), appSecret)) {
    return new Response('not found', { status: 404 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ ok: false, reason: 'unreadable payload' })
  }

  const incoming = extractMessengerMessages(payload)
  if (incoming.length === 0) return NextResponse.json({ ok: true, skipped: true })

  for (const message of incoming) {
    try {
      const connectionResult = await db
        .from('channel_connections')
        .select('id, business_id, token_ciphertext')
        .eq('channel', 'messenger')
        .eq('external_id', message.pageId)
        .maybeSingle()
      throwIfDbError('load messenger connection', connectionResult.error)
      const connection = connectionResult.data
      // A page we do not know is not an error. Meta sends deliveries for every
      // page subscribed to the app, including ones another environment owns.
      if (!connection?.token_ciphertext) continue

      const logged = await db
        .from('webhook_events')
        .insert({
          channel: 'messenger',
          connection_id: connection.id,
          business_id: connection.business_id,
          external_event_id: message.messageId,
          payload: message as unknown as Json,
        })
        .select('id')
        .single()
      if (isDatabaseConflict(logged.error, UNIQUE_VIOLATION)) continue
      throwIfDbError('log messenger delivery', logged.error)
      const eventId = logged.data!.id

      try {
        const business = await getBusinessById(connection.business_id)
        const turn = await handleCustomerMessage({
          business,
          channel: 'messenger',
          externalId: scopedExternalId(business.id, message.senderId),
          displayName: `Messenger ${message.senderId.slice(-6)}`,
          text: message.text,
        })
        if (turn.text) {
          await sendMessengerReply(decryptSecret(connection.token_ciphertext), message.senderId, turn.text)
        }
        await db
          .from('webhook_events')
          .update({ status: 'processed', processed_at: new Date().toISOString() })
          .eq('id', eventId)
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'messenger turn failed'
        console.error('[messenger]', reason)
        await db
          .from('webhook_events')
          .update({ status: 'failed', error: reason.slice(0, 500), processed_at: new Date().toISOString() })
          .eq('id', eventId)
      }
    } catch (error) {
      // One bad message in a batch must not drop the rest.
      console.error('[messenger] delivery skipped:', error instanceof Error ? error.message : error)
    }
  }

  return NextResponse.json({ ok: true })
}
