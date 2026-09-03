import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiRequestError, assertSameOriginBrowserPost, readJsonBody, validationPayload } from '@/lib/http/post.ts'
import { OrderError } from '@/lib/orders/create.ts'
import { orderErrorKm, orderErrorStatus } from '@/lib/orders/messages.ts'
import { placePublicOrder } from '@/lib/orders/public-order.ts'
import { resolvePublishedShop } from '@/lib/queries/storefront.ts'
import { createRateLimiter } from '@/lib/ops/rate-limit.ts'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * A customer orders from a shop's own site.
 *
 * The public sibling of the owner-only `POST /api/orders`, and a NEW route
 * rather than a widening of that one. Widening it would have meant accepting an
 * unauthenticated caller on a route whose tenant comes from a session, and the
 * only place left to put the tenant would have been the request body: a field a
 * caller could set to reach another shop. Here the tenant is the SLUG in this
 * route's own path, which is the address the customer is already on, and there
 * is no body field that can move it.
 *
 * A shop that never pressed publish is a 404 on its page and a 404 here, from
 * the same lookup, so the two can never disagree.
 *
 * The prices are not on the wire. The client sends product ids and quantities;
 * `createOrder` reads names, prices and the total from the catalogue inside the
 * transaction. A client cannot name its own price, and that is asserted rather
 * than described: see `db/test.mjs`.
 */
const Body = z
  .object({
    lines: z
      .array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().min(1).max(99) }).strict())
      .min(1)
      .max(30),
    // Required. Without it the owner reads "Order A4F9C2, 23,000" and has no
    // idea whose it is.
    customer_name: z.string().trim().min(1).max(80),
    customer_phone: z.string().trim().min(3).max(30).nullable().optional().default(null),
    note: z.string().trim().max(300).nullable().optional().default(null),
  })
  .strict()

/**
 * Two windows, because the two abuses are different shapes. One browser hammering
 * checkout is caught per IP; a shop being drained by many addresses is caught per
 * slug, which is the one that costs a real cafe its menu. Per instance and in
 * memory, like every other limiter here: it stops us doing work, and
 * `runExpiredOrders` is what actually gives the stock back.
 */
const perIp = createRateLimiter({ limit: 10, windowMs: 60_000 })
const perShop = createRateLimiter({ limit: 60, windowMs: 60_000 })

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.headers.get('x-real-ip')?.trim() || 'unknown'
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    assertSameOriginBrowserPost(req)
    const { slug } = await params

    const ip = perIp.check(`order:${clientIp(req)}`)
    if (!ip.allowed) throw new ApiRequestError(429, 'too many orders, please wait a moment')
    const shopRate = perShop.check(`order:${slug}`)
    if (!shopRate.allowed) throw new ApiRequestError(429, 'this shop is taking too many orders right now')

    const shop = await resolvePublishedShop(slug)
    // Unpublished and unknown are the same 404 on purpose. Telling a caller
    // which shops exist but have not published is telling it nothing useful and
    // something private.
    if (!shop) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const body = Body.parse(await readJsonBody(req, 8_000))
    const result = await placePublicOrder({
      businessId: shop.businessId,
      lines: body.lines.map((line) => ({ productId: line.product_id, quantity: line.quantity })),
      customerName: body.customer_name,
      customerPhone: body.customer_phone,
      note: body.note,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof OrderError) {
      // The reader here is a customer, in Khmer, and she can act on two of the
      // four codes. `message` stays the developer's sentence for the log.
      return NextResponse.json(
        { error: orderErrorKm(error.code), code: error.code },
        { status: orderErrorStatus(error.code) },
      )
    }
    if (error instanceof ApiRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(validationPayload(error), { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'order failed'
    console.error('[shop order]', message)
    return NextResponse.json({ error: 'ការបញ្ជាទិញនេះមិនបានសម្រេចទេ។ សូមព្យាយាមម្ដងទៀត។' }, { status: 502 })
  }
}
