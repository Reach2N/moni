import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMemberApi } from '@/lib/auth/member.ts'
import { ApiRequestError, assertSameOriginBrowserPost, readJsonBody, validationPayload } from '@/lib/http/post.ts'
import {
  clearPaymentAccount,
  getPaymentSettings,
  PaymentAccountError,
  setPaymentAccount,
} from '@/lib/payments/account.ts'

export const runtime = 'nodejs'
export const maxDuration = 30

const Body = z
  .object({
    account_id: z.string().trim().min(3).max(80),
    merchant_name: z.string().trim().max(80).nullable().optional(),
    merchant_city: z.string().trim().max(80).nullable().optional(),
  })
  .strict()

function failure(error: unknown) {
  if (error instanceof PaymentAccountError || error instanceof ApiRequestError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json(validationPayload(error), { status: 400 })
  }
  console.error('[money]', error instanceof Error ? error.message : 'failed')
  return NextResponse.json({ error: 'the payment account could not be saved' }, { status: 502 })
}

/** The shop's own receiving account. Read, set, clear: the JSON contract a Swift client would use too. */
export async function GET() {
  try {
    const member = await requireMemberApi()
    return NextResponse.json({ settings: await getPaymentSettings(member.businessId) })
  } catch (error) {
    return failure(error)
  }
}

export async function POST(req: Request) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()
    const body = Body.parse(await readJsonBody(req, 4_000))
    const settings = await setPaymentAccount(
      member.businessId,
      { accountId: body.account_id, merchantName: body.merchant_name, merchantCity: body.merchant_city },
      'owner via money',
    )
    return NextResponse.json({ settings })
  } catch (error) {
    return failure(error)
  }
}

export async function DELETE(req: Request) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()
    return NextResponse.json({ settings: await clearPaymentAccount(member.businessId, 'owner via money') })
  } catch (error) {
    return failure(error)
  }
}
