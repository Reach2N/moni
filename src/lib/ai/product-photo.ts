import 'server-only'
import { generateText } from 'ai'
import { withFallback } from './models.ts'
import { classifyRefusal, KHMER_REASON, productPhotoPrompt, REFUSAL_STATUS, type PhotoRefusal } from './photo-refusal.ts'

/**
 * A photo for one product, drawn from what the shop already told us.
 *
 * The refusal is a RESULT, not an exception. Verified on 2 September 2026:
 * every image model the key can see answers 429 with the free tier's daily
 * per-model quota already spent, and the gateway refuses them outright on its
 * free tier. A feature that cannot run today must still be reachable and must
 * say WHY, because the owner's next move differs by reason: enable billing,
 * wait until tomorrow, or take the photo herself.
 *
 * No text in the image, ever. A generated photo carrying invented Khmer words
 * puts a lie on a real shop's menu, and letters are exactly what image models
 * get wrong.
 */
/** Re-exported from a module with no `server-only`, so the test harness can prove them. */
export { classifyRefusal, productPhotoPrompt, REFUSAL_STATUS, KHMER_REASON }
export type { PhotoRefusal }

export type GeneratedPhoto =
  | { ok: true; bytes: ArrayBuffer; mediaType: string; model: string }
  | { ok: false; reason: PhotoRefusal; message: string }

export async function generateProductPhoto(input: {
  name: string
  description: string | null
  businessType: string
}): Promise<GeneratedPhoto> {
  try {
    const { result, ref } = await withFallback('image', (model, _ref, abortSignal) =>
      generateText({ model, prompt: productPhotoPrompt(input), abortSignal }),
    )
    const file = result.files?.find((candidate) => candidate.mediaType?.startsWith('image/'))
    if (!file) {
      // The chain answered and produced no picture, which is a different failure
      // from being refused and is worth its own log line.
      console.warn(`[product-photo] ${ref} answered with no image part`)
      return { ok: false, reason: 'failed', message: KHMER_REASON.failed }
    }
    const bytes = file.uint8Array
    return {
      ok: true,
      bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
      mediaType: file.mediaType,
      model: ref,
    }
  } catch (error) {
    const reason = classifyRefusal(error instanceof Error ? error.message : String(error))
    console.warn(`[product-photo] generation refused (${reason})`)
    return { ok: false, reason, message: KHMER_REASON[reason] }
  }
}
