import { randomUUID } from 'node:crypto'

/**
 * The rules for a product photo, kept pure so they can be asserted.
 *
 * These decide what reaches a PUBLIC bucket, so they are deliberately a closed
 * allow list rather than a deny list. A type nobody recognised is refused, not
 * stored and then guessed at by whatever renders it.
 *
 * No `server-only` here on purpose. See CLAUDE.md: that import makes a module
 * unimportable from `db/test.mjs`, which is where these rules are proved.
 */
export class MediaError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'MediaError'
    this.status = status
  }
}

/**
 * One frame each, and renderable by every phone browser in Cambodia. GIF is
 * absent deliberately: a menu photo is a photograph, and an animated one is a
 * surprise on a shop's public page.
 */
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export const ACCEPTED_IMAGE_TYPES = Object.keys(EXTENSIONS)

/** A shop owner photographs a plate of food on a phone. Six megabytes is generous for that. */
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024

export const MEDIA_BUCKET = 'shop-media'

export function assertUploadable(
  contentType: string | null,
  byteLength: number,
): { mediaType: string; extension: string } {
  // "image/webp; charset=binary" is a real header from a real client, so the
  // parameters are stripped rather than allowed to fail an equality check.
  const mediaType = contentType?.split(';')[0]?.trim().toLowerCase() ?? ''
  const extension = EXTENSIONS[mediaType]
  if (!extension) {
    throw new MediaError(
      415,
      `A photo must be ${ACCEPTED_IMAGE_TYPES.join(', ')}. This was ${contentType ?? 'not stated'}.`,
    )
  }
  if (byteLength <= 0) throw new MediaError(400, 'That photo was empty.')
  if (byteLength > MAX_IMAGE_BYTES) {
    throw new MediaError(413, `A photo must be under ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))} MB.`)
  }
  return { mediaType, extension }
}

/**
 * Business id first, so a shop's media is one prefix to list and one prefix to
 * remove. The random segment is what lets a replacement photo take a new name:
 * reusing the key would serve the old picture from any cache in front of it.
 */
export function storageKey(businessId: string, productId: string, extension: string): string {
  return `${businessId}/${productId}/${randomUUID()}.${extension}`
}
