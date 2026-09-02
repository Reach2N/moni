import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMemberApi } from '@/lib/auth/member.ts'
import { assertSameOriginBrowserPost, readJsonBody } from '@/lib/http/post.ts'
import { listCatalogue } from '@/lib/queries/catalogue.ts'
import { createProduct } from '@/lib/products/write.ts'
import { productFailure } from '@/lib/products/http.ts'
import { publicMediaUrl } from '@/lib/media/storage.ts'
import { CATALOG_KINDS } from '@/lib/types.ts'

export const runtime = 'nodejs'
export const maxDuration = 30

const NewBody = z
  .object({
    name: z.string().trim().min(1).max(120),
    name_en: z.string().trim().max(120).nullable().optional(),
    description: z.string().trim().max(600).nullable().optional(),
    price_minor: z.number().int().min(0),
    currency: z.enum(['KHR', 'USD']).optional(),
    category: z.string().trim().max(60).nullable().optional(),
    stock: z.number().int().min(0).nullable().optional(),
  })
  .strict()

/**
 * The catalogue, both kinds, and a way to add to it.
 *
 * The photo travels as a URL here and as a key in the row, because a client
 * cannot build the URL and should not learn where the bucket is.
 */
export async function GET(req: Request) {
  try {
    const member = await requireMemberApi()
    const url = new URL(req.url)
    const kindParam = url.searchParams.get('kind')
    const kind = CATALOG_KINDS.find((candidate) => candidate === kindParam)
    const items = await listCatalogue(member.businessId, {
      search: url.searchParams.get('search') ?? undefined,
      kind,
      includeInactive: url.searchParams.get('all') === '1',
    })
    return NextResponse.json({
      items: items.map((item) => ({ ...item, photo_url: publicMediaUrl(item.photo_path) })),
    })
  } catch (error) {
    return productFailure(error)
  }
}

export async function POST(req: Request) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()
    const body = NewBody.parse(await readJsonBody(req, 8_000))
    return NextResponse.json({ product: await createProduct(member.businessId, body) })
  } catch (error) {
    return productFailure(error)
  }
}
