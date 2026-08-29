import 'server-only'
import { db } from '../db.ts'
import { throwIfDbError, requireDbData } from '../db-result.ts'
import { sortInbox } from './inbox-order.ts'

/**
 * The central omnichannel inbox: every conversation from every channel in one
 * list. This is the control surface the product is named for, so the ordering is
 * the whole design. Escalations first, because they are the only rows that need
 * the owner; everything else is newest first, because that is how a shop reads.
 */
export type InboxRow = {
  id: string
  channel: string
  status: string
  needsOwnerReason: string | null
  lastMessageAt: string
  customerName: string
  preview: string | null
}

export type Transcript = {
  id: string
  channel: string
  status: string
  needsOwnerReason: string | null
  customerName: string
  messages: Array<{
    id: string
    role: string
    body: string
    createdAt: string
    toolCalls: unknown
  }>
}

export async function getInbox(businessId: string, limit = 60): Promise<InboxRow[]> {
  const result = await db
    .from('conversations')
    .select('id, channel, status, needs_owner_reason, last_message_at, customers(display_name)')
    .eq('business_id', businessId)
    .order('last_message_at', { ascending: false })
    .limit(limit)
  throwIfDbError('load inbox', result.error)
  const rows = result.data ?? []
  if (rows.length === 0) return []

  // One round trip for the previews rather than one per conversation. The inbox
  // is the screen an owner opens first, so it is the screen that must not crawl.
  const latest = await db
    .from('messages')
    .select('conversation_id, body, created_at')
    .eq('business_id', businessId)
    .in('conversation_id', rows.map((row) => row.id))
    .order('created_at', { ascending: false })
    .limit(400)
  throwIfDbError('load inbox previews', latest.error)

  const preview = new Map<string, string>()
  for (const message of latest.data ?? []) {
    if (!preview.has(message.conversation_id)) preview.set(message.conversation_id, message.body)
  }

  return sortInbox(
    rows.map((row) => ({
      id: row.id,
      channel: row.channel,
      status: row.status,
      needsOwnerReason: row.needs_owner_reason,
      lastMessageAt: row.last_message_at,
      customerName: row.customers?.display_name ?? 'អតិថិជន',
      preview: preview.get(row.id) ?? null,
    })),
  )
}

/**
 * The full transcript, which is the point of the inbox: the owner reads what was
 * promised in her name. Nothing is hidden, including the assistant's own note
 * that it handed the conversation over.
 */
export async function getTranscript(businessId: string, conversationId: string): Promise<Transcript> {
  const conversationResult = await db
    .from('conversations')
    .select('id, channel, status, needs_owner_reason, customers(display_name)')
    .eq('business_id', businessId)
    .eq('id', conversationId)
    .single()
  const conversation = requireDbData('load conversation', conversationResult)

  const messagesResult = await db
    .from('messages')
    .select('id, role, body, created_at, tool_calls')
    .eq('business_id', businessId)
    .eq('conversation_id', conversationId)
    .order('created_at')
    .limit(300)
  throwIfDbError('load transcript', messagesResult.error)

  return {
    id: conversation.id,
    channel: conversation.channel,
    status: conversation.status,
    needsOwnerReason: conversation.needs_owner_reason,
    customerName: conversation.customers?.display_name ?? 'អតិថិជន',
    messages: (messagesResult.data ?? []).map((message) => ({
      id: String(message.id),
      role: message.role,
      body: message.body,
      createdAt: message.created_at,
      toolCalls: message.tool_calls,
    })),
  }
}

/** How many conversations are waiting on the owner. Drives the tab badge. */
export async function countEscalations(businessId: string): Promise<number> {
  const result = await db
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'needs_owner')
  throwIfDbError('count escalations', result.error)
  return result.count ?? 0
}
