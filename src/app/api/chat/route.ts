import { NextRequest, NextResponse } from 'next/server'
import { generateText, stepCountIs } from 'ai'
import { z } from 'zod'
import { db } from '@/lib/db.ts'
import { isDatabaseConflict, requireDbData, throwIfDbError } from '@/lib/db-result.ts'
import type { Json } from '@/lib/database.types.ts'
import { customerTools } from '@/lib/agent/tools.ts'
import { CUSTOMER_SYSTEM, contextLine } from '@/lib/agent/prompt.ts'
import { costMicroUsd, withFallback } from '@/lib/ai/models.ts'
import { ApiRequestError, assertSameOriginBrowserPost, readJsonBody, validationPayload } from '@/lib/http/post.ts'
import { DEMO_BUSINESS_SLUG, DEMO_VISITOR_COOKIE, getDemoBusiness } from '@/lib/queries/demo-business.ts'

export const runtime = 'nodejs'
export const maxDuration = 60

const ChatBodySchema = z
  .object({
    // Legacy client fields are accepted but never used as authority.
    slug: z.literal(DEMO_BUSINESS_SLUG).optional(),
    visitor_id: z.string().max(160).optional(),
    name: z.string().trim().min(1).max(100).optional(),
    text: z.string().trim().min(1).max(2_000),
  })
  .strict()

const VisitorCookieSchema = z.string().uuid()

function visitorFor(req: NextRequest) {
  const existing = req.cookies.get(DEMO_VISITOR_COOKIE)?.value
  const valid = VisitorCookieSchema.safeParse(existing)
  return { id: valid.success ? valid.data : crypto.randomUUID(), isNew: !valid.success }
}

function withVisitorCookie<T>(response: NextResponse<T>, visitor: { id: string; isNew: boolean }) {
  if (visitor.isNew) {
    response.cookies.set(DEMO_VISITOR_COOKIE, visitor.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
  }
  return response
}

export async function POST(req: NextRequest) {
  let visitor: { id: string; isNew: boolean } | null = null
  try {
    assertSameOriginBrowserPost(req)
    const body = ChatBodySchema.parse(await readJsonBody(req, 12_000))
    visitor = visitorFor(req)
    const business = await getDemoBusiness()
    const externalId = `${business.slug}:${visitor.id}`
    const customerId = await getOrCreateVisitor(business.id, externalId, body.name)
    const conversation = await getOrCreateConversation(business.id, customerId)

    const customerMessage = await db.from('messages').insert({
      conversation_id: conversation.id,
      business_id: business.id,
      role: 'customer',
      body: body.text,
    })
    throwIfDbError('store customer message', customerMessage.error)

    const touched = await db
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation.id)
      .eq('business_id', business.id)
      .eq('customer_id', customerId)
      .select('id, status')
      .single()
    const currentConversation = requireDbData('touch customer conversation', touched)

    // Once handed to the owner, messages are recorded but the assistant is silent.
    if (currentConversation.status === 'needs_owner') {
      return withVisitorCookie(
        NextResponse.json({ text: null, handed_over: true, reason: 'already with the owner' }),
        visitor,
      )
    }

    const historyResult = await db
      .from('messages')
      .select('role, body')
      .eq('business_id', business.id)
      .eq('conversation_id', conversation.id)
      .in('role', ['customer', 'ai'])
      .order('created_at')
      .limit(40)
    throwIfDbError('load customer conversation history', historyResult.error)
    const messages = (historyResult.data ?? []).map((message) => ({
      role: message.role === 'customer' ? ('user' as const) : ('assistant' as const),
      content: message.body,
    }))

    const { result, ref } = await withFallback('chat', (model) =>
      generateText({
        model,
        system: `${CUSTOMER_SYSTEM}\n\n${contextLine(business.name, business.timezone)}`,
        messages,
        tools: customerTools(business.id, customerId, conversation.id),
        stopWhen: stepCountIs(8),
        temperature: 0.3,
      }),
    )

    const calls: { tool: string; args: Json }[] = JSON.parse(
      JSON.stringify(
        result.steps.flatMap((step) =>
          step.toolCalls.map((call) => ({ tool: call.toolName, args: call.input })),
        ),
      ),
    )
    const statusResult = await db
      .from('conversations')
      .select('status')
      .eq('id', conversation.id)
      .eq('business_id', business.id)
      .eq('customer_id', customerId)
      .single()
    const finalStatus = requireDbData('confirm conversation handoff state', statusResult).status
    const handedOver = finalStatus === 'needs_owner'
    const tokensIn = result.usage?.inputTokens ?? 0
    const tokensOut = result.usage?.outputTokens ?? 0
    const cost = costMicroUsd(ref, tokensIn, tokensOut)

    const assistantMessage = await db.from('messages').insert({
      conversation_id: conversation.id,
      business_id: business.id,
      role: handedOver ? 'system' : 'ai',
      body: handedOver ? 'Conversation handed to the owner; the assistant sent no reply.' : result.text,
      tool_calls: calls.length ? calls : null,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_micro_usd: cost,
    })
    throwIfDbError('store assistant result', assistantMessage.error)

    return withVisitorCookie(
      NextResponse.json({
        text: handedOver ? null : result.text,
        tool_calls: calls,
        handed_over: handedOver,
        model: ref,
        cost_micro_usd: cost,
      }),
      visitor,
    )
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(validationPayload(error), { status: 400 })
    }
    console.error('[chat]', error instanceof Error ? error.message : 'chat failed')
    const response = NextResponse.json({ error: 'The shop assistant is temporarily unavailable' }, { status: 502 })
    return visitor ? withVisitorCookie(response, visitor) : response
  }
}

async function getOrCreateVisitor(businessId: string, externalId: string, name?: string) {
  const identityResult = await db
    .from('customer_identities')
    .select('customer_id')
    .eq('channel', 'web')
    .eq('external_id', externalId)
    .maybeSingle()
  throwIfDbError('load web visitor identity', identityResult.error)

  if (identityResult.data) {
    const customerResult = await db
      .from('customers')
      .select('id')
      .eq('id', identityResult.data.customer_id)
      .eq('business_id', businessId)
      .single()
    return requireDbData('scope web visitor to demo business', customerResult).id
  }

  const customerResult = await db
    .from('customers')
    .insert({ business_id: businessId, display_name: name ?? 'Web visitor', locale: 'km' })
    .select('id')
    .single()
  const customer = requireDbData('create web visitor', customerResult)
  const identityInsert = await db.from('customer_identities').insert({
    customer_id: customer.id,
    channel: 'web',
    external_id: externalId,
  })
  if (isDatabaseConflict(identityInsert.error, '23505')) {
    const winnerResult = await db
      .from('customer_identities')
      .select('customer_id')
      .eq('channel', 'web')
      .eq('external_id', externalId)
      .single()
    const winner = requireDbData('recover concurrent web visitor', winnerResult)
    const scopedWinner = await db
      .from('customers')
      .select('id')
      .eq('id', winner.customer_id)
      .eq('business_id', businessId)
      .single()
    return requireDbData('scope concurrent web visitor', scopedWinner).id
  }
  throwIfDbError('create web visitor identity', identityInsert.error)
  return customer.id
}

async function getOrCreateConversation(businessId: string, customerId: string) {
  const existingResult = await db
    .from('conversations')
    .select('id, status')
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .eq('channel', 'web')
    .maybeSingle()
  throwIfDbError('load web conversation', existingResult.error)
  if (existingResult.data) return existingResult.data

  const insertedResult = await db
    .from('conversations')
    .insert({ business_id: businessId, customer_id: customerId, channel: 'web', status: 'open' })
    .select('id, status')
    .single()
  if (!isDatabaseConflict(insertedResult.error, '23505')) {
    return requireDbData('create web conversation', insertedResult)
  }

  const winnerResult = await db
    .from('conversations')
    .select('id, status')
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .eq('channel', 'web')
    .single()
  return requireDbData('recover concurrent web conversation', winnerResult)
}
