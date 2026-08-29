import 'server-only'
import { generateText, stepCountIs } from 'ai'
import { db } from '../db.ts'
import { isDatabaseConflict, requireDbData, throwIfDbError } from '../db-result.ts'
import type { Json } from '../database.types.ts'
import { costMicroUsd, withFallback } from '../ai/models.ts'
import { CUSTOMER_SYSTEM, contextLine, instructionsBlock } from './prompt.ts'
import { customerTools } from './tools.ts'

/**
 * One customer turn, for every channel.
 *
 * This used to live inside `/api/chat`. Phase 4 needed the identical loop behind
 * a Telegram webhook, and Phase 6 needs it behind Messenger, so it moved here
 * rather than being copied: the rule that the assistant never states a price it
 * did not get from a tool has to hold on every channel, and it will not stay
 * true in three transcriptions of the same hundred lines.
 *
 * ARCHITECTURE.md is explicit that the loop stays OUTSIDE grammY middleware for
 * exactly this reason. What a channel owns is identity and delivery. What it
 * does not own is the conversation.
 */
export type CustomerBusiness = {
  id: string
  name: string
  timezone: string
  ai_instructions: string | null
}

export type CustomerTurn = {
  conversationId: string
  customerId: string
  /** null when the assistant stayed silent because the owner has the conversation. */
  text: string | null
  handedOver: boolean
  toolCalls: { tool: string; args: Json }[]
  model: string | null
  costMicroUsd: number
}

/** Re-exported from a module with no `server-only`, so db/test.mjs can prove it. */
export { scopedExternalId } from './identity.ts'

export async function getOrCreateCustomer(
  businessId: string,
  channel: string,
  externalId: string,
  displayName: string,
): Promise<string> {
  const identityResult = await db
    .from('customer_identities')
    .select('customer_id')
    .eq('channel', channel)
    .eq('external_id', externalId)
    .maybeSingle()
  throwIfDbError('load customer identity', identityResult.error)

  if (identityResult.data) {
    // Scoped to the business on purpose. The identity table is global, so this
    // read is what proves the customer belongs to the shop that is answering.
    const customerResult = await db
      .from('customers')
      .select('id')
      .eq('id', identityResult.data.customer_id)
      .eq('business_id', businessId)
      .single()
    return requireDbData('scope customer to business', customerResult).id
  }

  const customerResult = await db
    .from('customers')
    .insert({ business_id: businessId, display_name: displayName, locale: 'km' })
    .select('id')
    .single()
  const customer = requireDbData('create customer', customerResult)

  const identityInsert = await db
    .from('customer_identities')
    .insert({ customer_id: customer.id, channel, external_id: externalId })
  if (isDatabaseConflict(identityInsert.error, '23505')) {
    // Two messages arrived at once. Telegram retries on a slow response, so this
    // is a normal race, not an error worth surfacing to a customer.
    const winnerResult = await db
      .from('customer_identities')
      .select('customer_id')
      .eq('channel', channel)
      .eq('external_id', externalId)
      .single()
    const winner = requireDbData('recover concurrent identity', winnerResult)
    const scoped = await db
      .from('customers')
      .select('id')
      .eq('id', winner.customer_id)
      .eq('business_id', businessId)
      .single()
    return requireDbData('scope concurrent customer', scoped).id
  }
  throwIfDbError('create customer identity', identityInsert.error)
  return customer.id
}

export async function getOrCreateConversation(businessId: string, customerId: string, channel: string) {
  const existingResult = await db
    .from('conversations')
    .select('id, status')
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .eq('channel', channel)
    .maybeSingle()
  throwIfDbError('load conversation', existingResult.error)
  if (existingResult.data) return existingResult.data

  const insertedResult = await db
    .from('conversations')
    .insert({ business_id: businessId, customer_id: customerId, channel, status: 'open' })
    .select('id, status')
    .single()
  if (!isDatabaseConflict(insertedResult.error, '23505')) {
    return requireDbData('create conversation', insertedResult)
  }

  const winnerResult = await db
    .from('conversations')
    .select('id, status')
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .eq('channel', channel)
    .single()
  return requireDbData('recover concurrent conversation', winnerResult)
}

/**
 * Store the customer's message, run the agent, store what it did.
 *
 * The message is recorded BEFORE the model runs, so a model failure loses an
 * answer and never a customer's words. That ordering is the whole reason the
 * webhook can return 200 on a bad day without dropping anything.
 */
export async function handleCustomerMessage({
  business,
  channel,
  externalId,
  displayName,
  text,
}: {
  business: CustomerBusiness
  channel: string
  externalId: string
  displayName: string
  text: string
}): Promise<CustomerTurn> {
  const customerId = await getOrCreateCustomer(business.id, channel, externalId, displayName)
  const conversation = await getOrCreateConversation(business.id, customerId, channel)

  const customerMessage = await db.from('messages').insert({
    conversation_id: conversation.id,
    business_id: business.id,
    role: 'customer',
    body: text,
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
  const current = requireDbData('touch conversation', touched)

  // Once handed to the owner the assistant is silent, on every channel. The
  // message is still recorded, so the owner reads the whole thread.
  if (current.status === 'needs_owner') {
    return {
      conversationId: conversation.id,
      customerId,
      text: null,
      handedOver: true,
      toolCalls: [],
      model: null,
      costMicroUsd: 0,
    }
  }

  const historyResult = await db
    .from('messages')
    .select('role, body')
    .eq('business_id', business.id)
    .eq('conversation_id', conversation.id)
    .in('role', ['customer', 'ai'])
    .order('created_at')
    .limit(40)
  throwIfDbError('load conversation history', historyResult.error)
  const messages = (historyResult.data ?? []).map((message) => ({
    role: message.role === 'customer' ? ('user' as const) : ('assistant' as const),
    content: message.body,
  }))

  const { result, ref } = await withFallback('chat', (model) =>
    generateText({
      model,
      system: `${CUSTOMER_SYSTEM}${instructionsBlock(business.ai_instructions)}\n\n${contextLine(business.name, business.timezone)}`,
      messages,
      tools: customerTools(business.id, customerId, conversation.id),
      stopWhen: stepCountIs(8),
      temperature: 0.3,
    }),
  )

  const toolCalls: { tool: string; args: Json }[] = JSON.parse(
    JSON.stringify(
      result.steps.flatMap((step) => step.toolCalls.map((call) => ({ tool: call.toolName, args: call.input }))),
    ),
  )

  // Re-read rather than trust the loop: escalate_to_owner is a tool the model
  // may have called mid-run, and the answer decides whether we speak at all.
  const statusResult = await db
    .from('conversations')
    .select('status')
    .eq('id', conversation.id)
    .eq('business_id', business.id)
    .eq('customer_id', customerId)
    .single()
  const handedOver = requireDbData('confirm handoff state', statusResult).status === 'needs_owner'

  const tokensIn = result.usage?.inputTokens ?? 0
  const tokensOut = result.usage?.outputTokens ?? 0
  const cost = costMicroUsd(ref, tokensIn, tokensOut)

  const assistantMessage = await db.from('messages').insert({
    conversation_id: conversation.id,
    business_id: business.id,
    role: handedOver ? 'system' : 'ai',
    body: handedOver ? 'Conversation handed to the owner; the assistant sent no reply.' : result.text,
    tool_calls: toolCalls.length ? toolCalls : null,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    cost_micro_usd: cost,
  })
  throwIfDbError('store assistant result', assistantMessage.error)

  return {
    conversationId: conversation.id,
    customerId,
    text: handedOver ? null : result.text,
    handedOver,
    toolCalls,
    model: ref,
    costMicroUsd: cost,
  }
}
