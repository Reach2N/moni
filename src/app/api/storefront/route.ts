import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMemberApi } from '@/lib/auth/member.ts'
import { ApiRequestError, assertSameOriginBrowserPost, readJsonBody, validationPayload } from '@/lib/http/post.ts'
import { sanityCheck, StorefrontSchema } from '@/lib/ai/storefront.ts'
import { getStorefrontRow, saveStorefrontDraft } from '@/lib/queries/storefront.ts'
import { generateShopSiteDraft, publishShopSite } from '@/lib/storefront/generate.ts'
import type { StorefrontContent } from '@/lib/types.ts'

export const runtime = 'nodejs'
export const maxDuration = 60

const Body = z
  .object({
    action: z.enum(['generate', 'save', 'publish']),
    /** Present for `save`: the owner's edits to the draft. */
    content: StorefrontSchema.optional(),
  })
  .strict()

export async function GET() {
  try {
    const member = await requireMemberApi()
    return NextResponse.json({ storefront: await getStorefrontRow(member.businessId) })
  } catch (error) {
    const status = error instanceof ApiRequestError ? error.status : 500
    return NextResponse.json({ error: 'that site could not be loaded' }, { status })
  }
}

/**
 * Generate, edit, publish. Three verbs, one endpoint, because they are three
 * steps of one act and a Swift client should not have to learn three URLs.
 *
 * Publishing is always the OWNER's. The model writes a draft of validated
 * strings; nothing it produced reaches a customer until a person pressed a
 * button, which is the whole safety argument for generated sites. Generation
 * and publication live in `src/lib/storefront/generate.ts`, shared with the
 * owner agent's SETUP tools, so both doors leave the same audit row.
 */
export async function POST(req: Request) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()
    const body = Body.parse(await readJsonBody(req, 16_000))

    if (body.action === 'publish') {
      const result = await publishShopSite(member.businessId, 'owner via site')
      if (!result.published) throw new ApiRequestError(400, 'there is no draft to publish')
      return NextResponse.json({ storefront: result.storefront })
    }

    if (body.action === 'save') {
      if (!body.content) throw new ApiRequestError(400, 'nothing to save')
      const content = body.content as StorefrontContent
      return NextResponse.json({
        storefront: await saveStorefrontDraft(member.businessId, content, 'owner'),
        // The owner's own edits get checked too. They are likelier to be right
        // than the model, and they are still writing a public page.
        warnings: sanityCheck(content, member.name),
      })
    }

    return NextResponse.json(await generateShopSiteDraft(member.businessId, 'owner via site'))
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(validationPayload(error), { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'storefront failed'
    console.error('[storefront]', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
