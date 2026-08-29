/**
 * What a schema cannot catch about generated website copy.
 *
 * Separate from `storefront.ts`, with relative imports and no AI SDK, so
 * `db/test.mjs` can prove it. These are the rules that keep a real business's
 * public page honest, and a rule nothing tests is a comment.
 */
import type { StorefrontContent } from '../types.ts'

export type StorefrontWarning = { field: string; issue: string }

/**
 * What a schema cannot catch: a model that padded a field with the shop's name
 * over and over, or slipped in markup, or invented a claim with a number in it.
 * Warnings do not block; they are shown to the owner, who publishes or does not.
 */
export function sanityCheck(content: StorefrontContent, shopName: string): StorefrontWarning[] {
  const warnings: StorefrontWarning[] = []
  const fields: Array<[string, string]> = [
    ['headline', content.headline],
    ['subhead', content.subhead],
    ['about', content.about],
    ['callToAction', content.callToAction],
    ...content.highlights.map((line, index) => [`highlights.${index}`, line] as [string, string]),
  ]

  for (const [field, value] of fields) {
    if (/<[a-z][\s\S]*>/i.test(value)) warnings.push({ field, issue: 'contains markup, which never belongs in generated copy' })
    if (value.includes('—')) warnings.push({ field, issue: 'contains an em dash' })
    // A currency figure in prose is the 100x bug all over again: prices come
    // from services.price_minor and are rendered beside this text, so any number
    // with money next to it is a second source of truth waiting to disagree.
    if (/[\d០-៩][\d០-៩,. ]*\s*(៛|riel|dollars?|usd|\$)/i.test(value)) {
      warnings.push({ field, issue: 'states a price, which must come from the catalogue instead' })
    }
    if (/\b(best|number one|award|5 star|five star|guarantee)\b/i.test(value)) {
      warnings.push({ field, issue: 'makes a claim the owner did not make' })
    }
  }

  const unique = new Set(content.highlights.map((line) => line.trim().toLowerCase()))
  if (unique.size !== content.highlights.length) {
    warnings.push({ field: 'highlights', issue: 'repeats itself' })
  }
  if (content.headline.trim().toLowerCase() === shopName.trim().toLowerCase()) {
    warnings.push({ field: 'headline', issue: 'is only the shop name, which says nothing' })
  }
  return warnings
}
