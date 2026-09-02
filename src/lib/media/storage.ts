import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { MEDIA_BUCKET, MediaError, storageKey } from './validate.ts'

/**
 * Supabase Storage, which ARCHITECTURE.md reserved for exactly this and which
 * until now was provisioned and unused: `@supabase/supabase-js` was installed
 * for Storage and then only ever used as the database client.
 *
 * A separate client from `src/lib/db.ts` because that one is typed against the
 * database schema and this one only moves bytes. Both use the service role,
 * which is the only way in: RLS is on everywhere with zero policies.
 */
let storageClient: ReturnType<typeof createClient> | undefined
function storage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    throw new MediaError(500, 'This deployment cannot store photos: Supabase is not configured.')
  }
  storageClient ??= createClient(url, key, { auth: { persistSession: false } })
  return storageClient.storage.from(MEDIA_BUCKET)
}

export async function uploadProductPhoto({
  businessId,
  productId,
  bytes,
  mediaType,
  extension,
}: {
  businessId: string
  productId: string
  bytes: ArrayBuffer
  mediaType: string
  extension: string
}): Promise<string> {
  const path = storageKey(businessId, productId, extension)
  const { error } = await storage().upload(path, bytes, { contentType: mediaType, upsert: false })
  if (error) throw new MediaError(502, `That photo could not be saved: ${error.message}`)
  return path
}

/**
 * Best effort, and deliberately so. A row pointing at a file that is gone is a
 * broken image on a shop's menu; a file with no row pointing at it is a few
 * kilobytes nobody sees. Only the first is worth failing a request over.
 */
export async function deleteStoredPhoto(path: string): Promise<void> {
  try {
    const { error } = await storage().remove([path])
    if (error) console.error('[media] photo not removed:', error.message)
  } catch (error) {
    console.error('[media] photo not removed:', error instanceof Error ? error.message : error)
  }
}

/**
 * The bucket is public, so the URL is derivable and needs no round trip.
 *
 * This is the ONLY function that knows the bucket is public, which is the point
 * of storing a key in `photo_path` rather than a URL: if that ever stops being
 * true, this function changes and no row does.
 */
export function publicMediaUrl(path: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!path || !base) return null
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`
}
