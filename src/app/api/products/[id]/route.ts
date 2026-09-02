import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMemberApi } from '@/lib/auth/member.ts'
import { assertSameOriginBrowserPost, readJsonBody } from '@/lib/http/post.ts'
import { archiveProduct, updateProduct } from '@/lib/products/write.ts'
import { productFailure } from '@/lib/products/http.ts'

export const runtime = 'nodejs'
export const maxDuration = 30

const PatchBody = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    name_en: z.string().trim().max(120).nullable().optional(),
    description: z.string().trim().max(600).nullable().optional(),
    price_minor: z.number().int().min(0).optional(),
    category: z.string().trim().max(60).nullable().optional(),
    stock: z.number().int().min(0).nullable().optional(),
    active: z.boolean().optional(),
  })
  .strict()

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()
    const { id } = await params
    const body = PatchBody.parse(await readJsonBody(req, 8_000))
    return NextResponse.json({ product: await updateProduct(member.businessId, id, body) })
  } catch (error) {
    return productFailure(error)
  }
}

/** Archive, never delete: an order_items row snapshots the name, and history must stay readable. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()
    const { id } = await params
    return NextResponse.json({ product: await archiveProduct(member.businessId, id) })
  } catch (error) {
    return productFailure(error)
  }
}
