import { NextResponse } from 'next/server'
import { requireMemberApi } from '@/lib/auth/member.ts'
import { ApiRequestError, assertSameOriginBrowserPost } from '@/lib/http/post.ts'
import { db } from '@/lib/db.ts'
import { requireDbData, throwIfDbError } from '@/lib/db-result.ts'
import { assertUploadable, MAX_IMAGE_BYTES, MediaError } from '@/lib/media/validate.ts'
import { deleteStoredPhoto, uploadProductPhoto } from '@/lib/media/storage.ts'

export const runtime = 'nodejs'
export const maxDuration = 60

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * One product's photo.
 *
 * The body is the raw image bytes, not JSON and not multipart, matching
 * `/api/transcribe` and for the same reason: base64 costs a third more bytes on
 * a phone in Takeo, and the blob's own content type IS the media type.
 */
function failure(error: unknown) {
  if (error instanceof MediaError || error instanceof ApiRequestError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('[products/photo]', error instanceof Error ? error.message : 'failed')
  return NextResponse.json({ error: 'that photo could not be saved' }, { status: 502 })
}

/** The product must be this member's, checked before a single byte is read. */
async function ownedProduct(businessId: string, id: string) {
  if (!UUID.test(id)) throw new ApiRequestError(404, 'no such product')
  const result = await db
    .from('products')
    .select('id, photo_path')
    .eq('id', id)
    .eq('business_id', businessId)
    .maybeSingle()
  throwIfDbError('load product for photo', result.error)
  if (!result.data) throw new ApiRequestError(404, 'no such product')
  return result.data
}

/** Replace the row's pointer first, then drop the old file. A failure anywhere leaves the photo it had. */
async function attach(businessId: string, productId: string, path: string, previous: string | null) {
  const saved = await db
    .from('products')
    .update({ photo_path: path, photo_alt: null })
    .eq('id', productId)
    .eq('business_id', businessId)
    .select('id, photo_path')
    .single()
  requireDbData('save product photo', saved)
  if (previous) await deleteStoredPhoto(previous)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()
    const { id } = await params
    const product = await ownedProduct(member.businessId, id)

    // Content-Length first, so an oversized upload is refused before the body is
    // pulled into memory rather than after.
    const declared = Number(req.headers.get('content-length') ?? '0')
    if (declared > MAX_IMAGE_BYTES) {
      throw new MediaError(413, `A photo must be under ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))} MB.`)
    }
    const bytes = await req.arrayBuffer()
    const { mediaType, extension } = assertUploadable(req.headers.get('content-type'), bytes.byteLength)

    const path = await uploadProductPhoto({
      businessId: member.businessId,
      productId: product.id,
      bytes,
      mediaType,
      extension,
    })
    await attach(member.businessId, product.id, path, product.photo_path)
    return NextResponse.json({ photo_path: path })
  } catch (error) {
    return failure(error)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()
    const { id } = await params
    const product = await ownedProduct(member.businessId, id)
    const cleared = await db
      .from('products')
      .update({ photo_path: null, photo_alt: null })
      .eq('id', product.id)
      .eq('business_id', member.businessId)
    throwIfDbError('clear product photo', cleared.error)
    if (product.photo_path) await deleteStoredPhoto(product.photo_path)
    return NextResponse.json({ photo_path: null })
  } catch (error) {
    return failure(error)
  }
}
