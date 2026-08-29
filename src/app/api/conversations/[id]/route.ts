import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMemberApi } from '@/lib/auth/member.ts'
import { ApiRequestError, assertSameOriginBrowserPost, readJsonBody, validationPayload } from '@/lib/http/post.ts'
import { db } from '@/lib/db.ts'
import { requireDbData, throwIfDbError } from '@/lib/db-result.ts'
import { getTranscript } from '@/lib/queries/inbox.ts'
import { deliverToCustomer } from '@/lib/channels/deliver.ts'

export const runtime = 'nodejs'
export const maxDuration = 30

const ReplyBody = z
  .object({
    text: z.string().trim().min(1).max(2_000),
    /** Hand the thread back to the assistant after this reply. */
    resume: z.boolean().optional().default(false),
  })
  .strict()

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireMemberApi()
    const { id } = await params
    return NextResponse.json(await getTranscript(member.businessId, id))
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[conversation]', error instanceof Error ? error.message : 'load failed')
    return NextResponse.json({ error: 'that conversation could not be opened' }, { status: 404 })
  }
}

/**
 * The owner replies in her own name, and optionally hands the thread back.
 *
 * The message is recorded as `owner`, not as `ai`, because the transcript is the
 * record of what was promised and by whom. An owner's discount is hers; the
 * assistant is not allowed to learn it as precedent.
 *
 * Delivery is attempted after the message is stored, and a failure is reported
 * rather than hidden: an owner who thinks she answered a customer and did not is
 * worse off than one who is told the channel is down.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()
    const { id } = await params
    const body = ReplyBody.parse(await readJsonBody(req, 8_000))

    const conversationResult = await db
      .from('conversations')
      .select('id, channel, customer_id, status')
      .eq('business_id', member.businessId)
      .eq('id', id)
      .single()
    const conversation = requireDbData('load conversation for reply', conversationResult)

    const stored = await db.from('messages').insert({
      conversation_id: conversation.id,
      business_id: member.businessId,
      role: 'owner',
      body: body.text,
    })
    throwIfDbError('store owner reply', stored.error)

    const delivery = await deliverToCustomer({
      businessId: member.businessId,
      customerId: conversation.customer_id,
      channel: conversation.channel,
      text: body.text,
    })

    const touched = await db
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        ...(body.resume ? { status: 'open', needs_owner_reason: null } : {}),
      })
      .eq('id', conversation.id)
      .eq('business_id', member.businessId)
      .select('status')
      .single()
    throwIfDbError('touch conversation after reply', touched.error)

    await db.from('events').insert({
      business_id: member.businessId,
      actor: 'owner',
      actor_label: 'owner via inbox',
      action: body.resume ? 'inbox.replied_and_resumed' : 'inbox.replied',
      entity_type: 'conversation',
      entity_id: conversation.id,
      after: { channel: conversation.channel, delivered: delivery.delivered },
    })

    return NextResponse.json({
      status: touched.data?.status ?? conversation.status,
      delivered: delivery.delivered,
      ...(delivery.reason ? { reason: delivery.reason } : {}),
    })
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(validationPayload(error), { status: 400 })
    }
    console.error('[conversation reply]', error instanceof Error ? error.message : 'reply failed')
    return NextResponse.json({ error: 'that reply could not be sent' }, { status: 502 })
  }
}

/** Hand the thread back to the assistant without saying anything. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()
    const { id } = await params

    const resumed = await db
      .from('conversations')
      .update({ status: 'open', needs_owner_reason: null })
      .eq('business_id', member.businessId)
      .eq('id', id)
      .select('id, status')
      .single()
    const conversation = requireDbData('resume conversation', resumed)

    await db.from('events').insert({
      business_id: member.businessId,
      actor: 'owner',
      actor_label: 'owner via inbox',
      action: 'inbox.resumed',
      entity_type: 'conversation',
      entity_id: conversation.id,
    })

    return NextResponse.json({ status: conversation.status })
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[conversation resume]', error instanceof Error ? error.message : 'resume failed')
    return NextResponse.json({ error: 'that conversation could not be resumed' }, { status: 502 })
  }
}
