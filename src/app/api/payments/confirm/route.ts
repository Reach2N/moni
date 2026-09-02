import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMemberApi } from '@/lib/auth/member.ts'
import { ApiRequestError, assertSameOriginBrowserPost, readJsonBody, validationPayload } from '@/lib/http/post.ts'
import { confirmPayment } from '@/lib/payments/confirm.ts'

export const runtime = 'nodejs'
export const maxDuration = 30

const Body = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/) }).strict()

/**
 * "The money arrived." The inbox button and the money screen post here; the
 * owner agent reaches the same `confirmPayment` through its tool. One rule set,
 * two doors, and the tenant is the session's, never the body's.
 */
export async function POST(req: Request) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()
    const { code } = Body.parse(await readJsonBody(req, 2_000))
    return NextResponse.json(await confirmPayment({ businessId: member.businessId, code, actorLabel: 'owner via inbox' }))
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(validationPayload(error), { status: 400 })
    }
    console.error('[payments/confirm]', error instanceof Error ? error.message : 'confirm failed')
    return NextResponse.json({ error: 'the payment could not be confirmed' }, { status: 502 })
  }
}
