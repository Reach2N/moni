/**
 * The pure half of product photo generation: the prompt, and what a refusal
 * means.
 *
 * It lives beside `product-photo.ts` rather than inside it because that module
 * imports the AI SDK and `server-only`, and `server-only` makes a module
 * unimportable from a Node test script (CLAUDE.md, paid for once already). The
 * same split as `sanity.ts` beside `parse.ts` and `gate.ts` beside `member.ts`:
 * the rules that need proving live where a test can reach them.
 */
export type PhotoRefusal = 'unavailable' | 'quota' | 'slow' | 'failed'

/** In Khmer, because the owner reads this, and each one names a different next move. */
export const KHMER_REASON: Record<PhotoRefusal, string> = {
  unavailable: 'គណនី AI នេះមិនទាន់អាចបង្កើតរូបភាពបានទេ។ សូមបញ្ចូលរូបពីទូរស័ព្ទរបស់អ្នកជំនួស។',
  quota: 'ចំនួនរូបភាពឥតគិតថ្លៃថ្ងៃនេះអស់ហើយ។ សូមសាកថ្ងៃស្អែក ឬបញ្ចូលរូបពីទូរស័ព្ទរបស់អ្នក។',
  slow: 'ការបង្កើតរូបភាពយឺតពេក។ សូមសាកម្តងទៀត ឬបញ្ចូលរូបពីទូរស័ព្ទរបស់អ្នក។',
  failed: 'មិនអាចបង្កើតរូបភាពបានទេ។ សូមបញ្ចូលរូបពីទូរស័ព្ទរបស់អ្នកជំនួស។',
}

/** HTTP status per reason, so a caller answers without re-reading the message. */
export const REFUSAL_STATUS: Record<PhotoRefusal, number> = {
  unavailable: 503,
  quota: 503,
  slow: 504,
  failed: 502,
}

/**
 * Which refusal this was.
 *
 * The order matters. The router's own timeout is checked first because it is
 * ours and unambiguous. Entitlement comes before quota, matching the
 * distinction `models.ts` already draws: a plan that does not include the model
 * is a billing fact that waiting will not fix, while a quota is a window that
 * reopens. Telling the owner the wrong one sends her to the wrong action.
 */
export function classifyRefusal(message: string): PhotoRefusal {
  if (/did not answer within|ran out of time/i.test(message)) return 'slow'
  if (/free tier|do not have access|not available on your plan|payment required/i.test(message)) return 'unavailable'
  if (/quota|exhausted|RESOURCE_EXHAUSTED|\b429\b/i.test(message)) return 'quota'
  return 'failed'
}

/**
 * No text in the image, ever. A generated photo carrying invented Khmer words
 * puts a lie on a real shop's menu, and letters are exactly what image models
 * get wrong.
 */
export function productPhotoPrompt(input: {
  name: string
  description: string | null
  businessType: string
}): string {
  return [
    `A clean product photograph of "${input.name}"`,
    input.description ? `, which the shop describes as: ${input.description}` : '',
    `, sold by a small ${input.businessType} in Cambodia.`,
    ' Plain neutral background, soft even lighting, the item centred and filling the frame, square crop, photographic and realistic.',
    ' Absolutely no text, no letters, no numbers, no logo, no watermark, no hands and no people.',
  ].join('')
}
