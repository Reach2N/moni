import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMemberApi } from '@/lib/auth/member.ts'
import { ApiRequestError, assertSameOriginBrowserPost, readJsonBody, validationPayload } from '@/lib/http/post.ts'
import { db } from '@/lib/db.ts'
import { throwIfDbError } from '@/lib/db-result.ts'
import { decryptSecret, encryptSecret, SecretKeyError } from '@/lib/crypto/secrets.ts'
import { MessengerError, subscribePage, unsubscribePage, verifyPageToken } from '@/lib/channels/messenger.ts'

export const runtime = 'nodejs'
export const maxDuration = 30

const ConnectBody = z.object({ pageToken: z.string().trim().min(40).max(500) }).strict()

function failure(error: unknown) {
  if (error instanceof MessengerError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof SecretKeyError) {
    console.error('[channels/messenger]', error.message)
    return NextResponse.json({ error: 'this deployment cannot store channel tokens yet' }, { status: 500 })
  }
  if (error instanceof ApiRequestError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json(validationPayload(error), { status: 400 })
  }
  console.error('[channels/messenger]', error instanceof Error ? error.message : 'connect failed')
  return NextResponse.json({ error: 'Messenger could not be connected' }, { status: 502 })
}

/**
 * Connect a Facebook page.
 *
 * Unlike Telegram there is no per-connection webhook URL: Meta calls one address
 * for the whole app, so the page id is what resolves the shop. It is stored in
 * `external_id` and the webhook looks the shop up by it.
 *
 * `subscribed_apps` is the step everyone forgets. Without it the app is
 * configured, the webhook verifies, and not one message ever arrives.
 */
export async function POST(req: Request) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()
    const { pageToken } = ConnectBody.parse(await readJsonBody(req, 4_000))

    const page = await verifyPageToken(pageToken)
    await subscribePage(pageToken)

    const saved = await db
      .from('channel_connections')
      .upsert(
        {
          business_id: member.businessId,
          channel: 'messenger',
          external_id: page.externalId,
          display_name: page.displayName,
          token_ciphertext: encryptSecret(pageToken),
          // The app secret is OURS, not the owner's, so it is resolved from the
          // environment by name rather than stored per row. That is exactly what
          // schema.sql means by secret_ref.
          secret_ref: 'META_APP_SECRET',
          status: 'connected',
          connected_at: new Date().toISOString(),
          last_error: null,
        },
        { onConflict: 'business_id,channel' },
      )
      .select('id, display_name, status, connected_at')
      .single()
    throwIfDbError('save messenger connection', saved.error)

    await db.from('events').insert({
      business_id: member.businessId,
      actor: 'owner',
      actor_label: 'owner via settings',
      action: 'channel.connected',
      entity_type: 'channel_connection',
      entity_id: saved.data!.id,
      after: { channel: 'messenger', page: page.displayName, external_id: page.externalId },
    })

    return NextResponse.json({ connection: saved.data })
  } catch (error) {
    return failure(error)
  }
}

export async function DELETE(req: Request) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()

    const existing = await db
      .from('channel_connections')
      .select('id, token_ciphertext')
      .eq('business_id', member.businessId)
      .eq('channel', 'messenger')
      .maybeSingle()
    throwIfDbError('load messenger connection', existing.error)
    if (!existing.data) return NextResponse.json({ connection: null })

    if (existing.data.token_ciphertext) {
      try {
        await unsubscribePage(decryptSecret(existing.data.token_ciphertext))
      } catch (error) {
        console.error('[channels/messenger] page not unsubscribed:', error instanceof Error ? error.message : error)
      }
    }

    const cleared = await db
      .from('channel_connections')
      .update({ status: 'disconnected', token_ciphertext: null, connected_at: null, last_error: null })
      .eq('id', existing.data.id)
      .eq('business_id', member.businessId)
    throwIfDbError('disconnect messenger', cleared.error)

    await db.from('events').insert({
      business_id: member.businessId,
      actor: 'owner',
      actor_label: 'owner via settings',
      action: 'channel.disconnected',
      entity_type: 'channel_connection',
      entity_id: existing.data.id,
      after: { channel: 'messenger' },
    })

    return NextResponse.json({ connection: null })
  } catch (error) {
    return failure(error)
  }
}
