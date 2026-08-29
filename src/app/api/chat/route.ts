import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiRequestError, assertSameOriginBrowserPost, readJsonBody, validationPayload } from '@/lib/http/post.ts'
import { handleCustomerMessage, scopedExternalId } from '@/lib/agent/customer-loop.ts'
import { memberGate } from '@/lib/auth/member.ts'
import { getBusinessById } from '@/lib/queries/business.ts'
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
      maxAge: 60 * 60 * 24 * 30,
    })
  }
  return response
}

/**
 * Whose shop is answering.
 *
 * A customer never signs in, so signed out means the public demo shop. A
 * signed-in member is an OWNER trying their own assistant from the dashboard,
 * and they get their own catalogue, hours and standing instructions.
 *
 * The tenant comes from the session and never from the body: the `slug` field is
 * pinned to the demo shop and cannot select anything.
 */
async function chatBusiness() {
  const gate = await memberGate()
  return gate.status === 'member' ? getBusinessById(gate.member.businessId) : getDemoBusiness()
}

/**
 * The browser's customer channel. Since Phase 4 the conversation itself lives in
 * `handleCustomerMessage`, shared with the Telegram webhook, so this route owns
 * only what is specific to a browser: the origin check, the visitor cookie, and
 * the JSON contract.
 */
export async function POST(req: NextRequest) {
  let visitor: { id: string; isNew: boolean } | null = null
  try {
    assertSameOriginBrowserPost(req)
    const body = ChatBodySchema.parse(await readJsonBody(req, 12_000))
    visitor = visitorFor(req)
    const business = await chatBusiness()

    const turn = await handleCustomerMessage({
      business,
      channel: 'web',
      externalId: scopedExternalId(business.id, visitor.id),
      displayName: body.name ?? 'Web visitor',
      text: body.text,
    })

    return withVisitorCookie(
      NextResponse.json({
        text: turn.text,
        tool_calls: turn.toolCalls,
        handed_over: turn.handedOver,
        model: turn.model,
        cost_micro_usd: turn.costMicroUsd,
        ...(turn.handedOver && turn.model === null ? { reason: 'already with the owner' } : {}),
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
