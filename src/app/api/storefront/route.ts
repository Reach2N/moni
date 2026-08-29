import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMemberApi } from '@/lib/auth/member.ts'
import { ApiRequestError, assertSameOriginBrowserPost, readJsonBody, validationPayload } from '@/lib/http/post.ts'
import { db } from '@/lib/db.ts'
import { requireDbData, throwIfDbError } from '@/lib/db-result.ts'
import { generateStorefront, sanityCheck, StorefrontSchema } from '@/lib/ai/storefront.ts'
import { getStorefrontRow, publishStorefront, saveStorefrontDraft } from '@/lib/queries/storefront.ts'
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
 * button, which is the whole safety argument for generated sites.
 */
export async function POST(req: Request) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()
    const body = Body.parse(await readJsonBody(req, 16_000))

    if (body.action === 'publish') {
      return NextResponse.json({ storefront: await publishStorefront(member.businessId) })
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

    const businessResult = await db
      .from('businesses')
      .select('name, business_type, raw_description, ai_instructions, hours')
      .eq('id', member.businessId)
      .single()
    const business = requireDbData('load business for storefront', businessResult)

    const servicesResult = await db
      .from('services')
      .select('name, name_en, duration_min, unit')
      .eq('business_id', member.businessId)
      .eq('active', true)
      .order('sort_order')
    throwIfDbError('load services for storefront', servicesResult.error)

    const generated = await generateStorefront({
      shopName: business.name,
      businessType: business.business_type,
      rawDescription: business.raw_description,
      aiInstructions: business.ai_instructions,
      services: (servicesResult.data ?? []).map((service) => ({
        name: service.name,
        nameEn: service.name_en,
        durationMin: service.duration_min,
        unit: service.unit,
      })),
      hours: (business.hours as Array<{ dow: number; open: string; close: string }>) ?? [],
    })

    const storefront = await saveStorefrontDraft(member.businessId, generated.content, generated.model)

    await db.from('events').insert({
      business_id: member.businessId,
      actor: 'owner',
      actor_label: `owner via site (${generated.model})`,
      action: 'storefront.generated',
      entity_type: 'business',
      entity_id: member.businessId,
      after: { theme: generated.content.theme, warnings: generated.warnings.length },
    })

    return NextResponse.json({
      storefront,
      warnings: generated.warnings,
      model: generated.model,
      cost_micro_usd: generated.cost_micro_usd,
    })
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
