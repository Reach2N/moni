import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMemberApi } from '@/lib/auth/member.ts'
import { ApiRequestError, assertSameOriginBrowserPost, readJsonBody, validationPayload } from '@/lib/http/post.ts'
import { throwIfDbError } from '@/lib/db-result.ts'
import { db } from '@/lib/db.ts'
import { decryptSecret, encryptSecret, newWebhookSecret, SecretKeyError } from '@/lib/crypto/secrets.ts'
import { ChannelError, connectWebhook, disconnectWebhook, verifyBotToken } from '@/lib/channels/telegram.ts'

export const runtime = 'nodejs'
export const maxDuration = 30

const ConnectBody = z.object({ token: z.string().trim().min(20).max(200) }).strict()

/**
 * Where Telegram will call us back.
 *
 * Telegram refuses anything that is not public HTTPS, so a laptop cannot receive
 * webhooks without a tunnel. Failing here with that sentence is far kinder than
 * letting the owner press Connect and watch nothing arrive.
 */
function webhookBase(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const base = configured || (forwardedHost ? `https://${forwardedHost}` : new URL(req.url).origin)
  if (!base.startsWith('https://')) {
    throw new ApiRequestError(
      400,
      'Telegram only calls public HTTPS addresses. Deploy first, or point NEXT_PUBLIC_APP_URL at an https tunnel.',
    )
  }
  return base
}

function failure(error: unknown) {
  if (error instanceof ChannelError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof SecretKeyError) {
    console.error('[channels/telegram]', error.message)
    return NextResponse.json({ error: 'this deployment cannot store channel tokens yet' }, { status: 500 })
  }
  if (error instanceof ApiRequestError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json(validationPayload(error), { status: 400 })
  }
  console.error('[channels/telegram]', error instanceof Error ? error.message : 'connect failed')
  return NextResponse.json({ error: 'Telegram could not be connected' }, { status: 502 })
}

/**
 * Connect a bot. Paste the BotFather token, we prove it works, store it
 * encrypted, and point Telegram at this shop's own webhook.
 *
 * Order matters: verify, then store, then set the webhook. A token that is
 * stored but never verified leaves a shop looking connected while every customer
 * message vanishes.
 */
export async function POST(req: Request) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()
    const { token } = ConnectBody.parse(await readJsonBody(req, 4_000))

    const bot = await verifyBotToken(token)
    const secret = newWebhookSecret()

    const saved = await db
      .from('channel_connections')
      .upsert(
        {
          business_id: member.businessId,
          channel: 'telegram',
          external_id: bot.externalId,
          display_name: bot.displayName,
          token_ciphertext: encryptSecret(token),
          webhook_secret: secret,
          status: 'connecting',
          last_error: null,
        },
        { onConflict: 'business_id,channel' },
      )
      .select('id')
      .single()
    throwIfDbError('save telegram connection', saved.error)
    const connectionId = saved.data!.id

    try {
      await connectWebhook(token, `${webhookBase(req)}/api/webhooks/telegram/${connectionId}`, secret)
    } catch (error) {
      // The row stays, carrying why, so the owner sees a reason rather than a
      // connect button that silently did nothing.
      const message = error instanceof Error ? error.message : 'webhook could not be set'
      await db
        .from('channel_connections')
        .update({ status: 'error', last_error: message })
        .eq('id', connectionId)
        .eq('business_id', member.businessId)
      throw error
    }

    const live = await db
      .from('channel_connections')
      .update({ status: 'connected', connected_at: new Date().toISOString(), last_error: null })
      .eq('id', connectionId)
      .eq('business_id', member.businessId)
      .select('id, display_name, status, connected_at')
      .single()
    throwIfDbError('mark telegram connected', live.error)

    await db.from('events').insert({
      business_id: member.businessId,
      actor: 'owner',
      actor_label: 'owner via settings',
      action: 'channel.connected',
      entity_type: 'channel_connection',
      entity_id: connectionId,
      // The token is never in an audit row. The bot's public identity is.
      after: { channel: 'telegram', bot: bot.displayName, external_id: bot.externalId },
    })

    return NextResponse.json({ connection: live.data })
  } catch (error) {
    return failure(error)
  }
}

/** Disconnect. Telegram stops calling, and the stored token is destroyed. */
export async function DELETE(req: Request) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()

    const existing = await db
      .from('channel_connections')
      .select('id, token_ciphertext')
      .eq('business_id', member.businessId)
      .eq('channel', 'telegram')
      .maybeSingle()
    throwIfDbError('load telegram connection', existing.error)
    if (!existing.data) return NextResponse.json({ connection: null })

    if (existing.data.token_ciphertext) {
      // Best effort. If Telegram is unreachable the token is still destroyed
      // below, and a webhook to a connection with no token cannot reply anyway.
      try {
        await disconnectWebhook(decryptSecret(existing.data.token_ciphertext))
      } catch (error) {
        console.error('[channels/telegram] webhook not removed:', error instanceof Error ? error.message : error)
      }
    }

    const cleared = await db
      .from('channel_connections')
      .update({
        status: 'disconnected',
        token_ciphertext: null,
        webhook_secret: null,
        connected_at: null,
        last_error: null,
      })
      .eq('id', existing.data.id)
      .eq('business_id', member.businessId)
    throwIfDbError('disconnect telegram', cleared.error)

    await db.from('events').insert({
      business_id: member.businessId,
      actor: 'owner',
      actor_label: 'owner via settings',
      action: 'channel.disconnected',
      entity_type: 'channel_connection',
      entity_id: existing.data.id,
      after: { channel: 'telegram' },
    })

    return NextResponse.json({ connection: null })
  } catch (error) {
    return failure(error)
  }
}
