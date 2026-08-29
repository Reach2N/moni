import { requireMemberApi } from '@/lib/auth/member.ts'
import { ApiRequestError } from '@/lib/http/post.ts'
import { db } from '@/lib/db.ts'

export const runtime = 'nodejs'
export const maxDuration = 300

const TICK_MS = 1_500
const MAX_LIFETIME_MS = 4 * 60 * 1_000

/**
 * Live updates for the open dashboard, over Server-Sent Events.
 *
 * NOT Supabase Realtime, and this is the load-bearing reason: Realtime respects
 * RLS, and RLS here is deny-all with zero policies, so the browser would receive
 * nothing. Making it work would mean opening the Data API and shipping the anon
 * key, which is exactly the step ARCHITECTURE.md section 1 cancelled. Owning the
 * stream also keeps the API-first rule: `URLSession` consumes SSE with no vendor
 * SDK, so the future Swift client gets this for free.
 *
 * It polls rather than listens. Two reasons, both about where this runs: a
 * serverless instance shares no memory with the instance that handled the
 * Telegram webhook, so an in-process emitter would only ever see its own
 * requests, and `LISTEN/NOTIFY` needs a session-mode connection that Supavisor's
 * transaction mode does not give us. A 1.5 second poll on two indexed columns
 * comfortably meets the "under two seconds" acceptance check, and the cursor
 * means each tick returns nothing at all when nothing changed.
 */
export async function GET(req: Request, { params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params
  try {
    const member = await requireMemberApi()
    // The path names a tenant, so the path is checked against the session. A
    // business id is not a secret and must never be an authorisation.
    if (member.businessId !== businessId) {
      return Response.json({ error: 'not your shop' }, { status: 403 })
    }
  } catch (error) {
    const status = error instanceof ApiRequestError ? error.status : 500
    return Response.json({ error: 'sign in required' }, { status })
  }

  const encoder = new TextEncoder()
  let since = new Date().toISOString()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      send('ready', { since })
      const startedAt = Date.now()

      const tick = async () => {
        if (closed) return
        try {
          const cursor = since
          const now = new Date().toISOString()

          const [bookings, conversations] = await Promise.all([
            db
              .from('v_bookings_agent')
              .select('id, code, status, starts_at, ends_at, customer_name, service_name, resource_name, channel, price_minor, paid_minor, currency')
              .eq('business_id', businessId)
              .gt('updated_at', cursor)
              .order('updated_at')
              .limit(50),
            db
              .from('conversations')
              .select('id, channel, status, needs_owner_reason, last_message_at')
              .eq('business_id', businessId)
              .gt('last_message_at', cursor)
              .order('last_message_at')
              .limit(50),
          ])

          // A read failure is not a reason to drop the stream. The next tick is
          // 1.5 seconds away, and a dashboard that reconnects in a loop is worse
          // than one that is briefly stale.
          if (bookings.error || conversations.error) {
            send('warning', { message: 'a refresh failed, still watching' })
          } else {
            if (bookings.data?.length) send('bookings', bookings.data)
            if (conversations.data?.length) send('conversations', conversations.data)
            since = now
          }
        } catch {
          send('warning', { message: 'a refresh failed, still watching' })
        }

        // Proxies and serverless platforms cut long responses, so the stream
        // ends itself politely and the browser's own EventSource reconnects.
        if (Date.now() - startedAt > MAX_LIFETIME_MS) {
          send('bye', { reason: 'reconnect' })
          closed = true
          controller.close()
          return
        }
        setTimeout(() => void tick(), TICK_MS)
      }

      setTimeout(() => void tick(), TICK_MS)

      req.signal.addEventListener('abort', () => {
        closed = true
        try { controller.close() } catch { /* already closed */ }
      })
    },
    cancel() {
      closed = true
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      // Nginx and friends buffer by default, which turns a live stream into one
      // long silence followed by everything at once.
      'x-accel-buffering': 'no',
    },
  })
}
