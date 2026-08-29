import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMemberApi } from '@/lib/auth/member.ts'
import { ApiRequestError, assertSameOriginBrowserPost, readJsonBody, validationPayload } from '@/lib/http/post.ts'
import { createOrder, OrderError } from '@/lib/orders/create.ts'
import { withTransaction } from '@/lib/orders/connection.ts'

export const runtime = 'nodejs'
export const maxDuration = 30

const Body = z
  .object({
    customer_id: z.string().uuid().nullable().optional().default(null),
    channel: z.enum(['telegram', 'messenger', 'web', 'walk_in', 'phone']).default('walk_in'),
    note: z.string().trim().max(500).nullable().optional().default(null),
    lines: z
      .array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().min(1).max(999) }).strict())
      .min(1)
      .max(50),
  })
  .strict()

/**
 * Create an order. The whole thing happens in one transaction, which is the
 * reason this route does not go through `src/lib/db.ts`: PostgREST cannot
 * decrement stock and allocate a gapless invoice number atomically, and doing
 * them separately oversells and duplicates numbers under exactly the load a
 * successful shop has.
 *
 * The caller sends product ids and quantities and nothing else. Prices, names
 * and the total all come from the catalogue inside the transaction, so a client
 * cannot name its own price.
 */
export async function POST(req: Request) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()
    const body = Body.parse(await readJsonBody(req, 8_000))

    const order = await withTransaction((tx) =>
      createOrder(tx, {
        businessId: member.businessId,
        customerId: body.customer_id,
        channel: body.channel,
        note: body.note,
        lines: body.lines.map((line) => ({ productId: line.product_id, quantity: line.quantity })),
      }),
    )

    return NextResponse.json({ order })
  } catch (error) {
    if (error instanceof OrderError) {
      // 409 for out of stock: the request was well formed and the world moved.
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === 'out_of_stock' ? 409 : 400 },
      )
    }
    if (error instanceof ApiRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(validationPayload(error), { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'order failed'
    console.error('[orders]', message)
    return NextResponse.json({ error: 'that order could not be placed' }, { status: 502 })
  }
}
