import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMemberApi } from '@/lib/auth/member.ts'
import { ApiRequestError, assertSameOriginBrowserPost, readJsonBody, validationPayload } from '@/lib/http/post.ts'
import { db } from '@/lib/db.ts'
import { throwIfDbError } from '@/lib/db-result.ts'

export const runtime = 'nodejs'

const Body = z.object({ seed: z.number().int().min(0).max(2147483647) }).strict()

/**
 * The owner keeps one of the looks she was offered.
 *
 * A seed is not content, so it does not go through draft and publish: it takes
 * effect on the live site immediately, the way changing a price does. That is
 * deliberate. The publish gate exists because the MODEL wrote the words and a
 * person must read them first. Nobody needs to review a colour the owner
 * herself just tapped.
 */
export async function POST(req: Request) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()
    const { seed } = Body.parse(await readJsonBody(req, 1_000))

    const saved = await db
      .from('storefronts')
      .update({ seed })
      .eq('id', member.businessId)
      .select('seed')
      .single()
    throwIfDbError('save storefront seed', saved.error)

    await db.from('events').insert({
      business_id: member.businessId,
      actor: 'owner',
      actor_label: 'owner via site',
      action: 'storefront.seed_chosen',
      entity_type: 'business',
      entity_id: member.businessId,
      after: { seed },
    })

    return NextResponse.json({ seed })
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(validationPayload(error), { status: 400 })
    }
    console.error('[storefront/seed]', error instanceof Error ? error.message : 'seed failed')
    return NextResponse.json({ error: 'that look could not be saved' }, { status: 500 })
  }
}
