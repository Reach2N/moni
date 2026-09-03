/**
 * What a schema cannot catch about generated website copy.
 *
 * Separate from `storefront.ts`, with relative imports and no AI SDK, so
 * `db/test.mjs` can prove it. These are the rules that keep a real business's
 * public page honest, and a rule nothing tests is a comment.
 */
import { WARMTHS, VOICES, DENSITIES, type StorefrontContent } from '../types.ts'

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

  // A vibe is the one field here that becomes colour rather than words, so a
  // missing or invented one is caught with the same seriousness as an invented
  // claim: both reach a real shop's public site.
  const vibe = (content as { vibe?: { warmth?: string; voice?: string; density?: string } }).vibe
  const vibeOk =
    !!vibe &&
    (WARMTHS as readonly string[]).includes(vibe.warmth ?? '') &&
    (VOICES as readonly string[]).includes(vibe.voice ?? '') &&
    (DENSITIES as readonly string[]).includes(vibe.density ?? '')
  if (!vibeOk) {
    warnings.push({ field: 'vibe', issue: 'no usable vibe was chosen, so the site will fall back to the quiet default' })
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

/**
 * True when this rule fired and nothing else did. `generateStorefront` uses
 * this to decide whether its one bounded retry is worth spending: a headline
 * that merely repeats the shop name is a prompting miss a reroll can plausibly
 * fix, but any other warning, alone or alongside this one, is a fact about the
 * generation (a claim, a price, a markup fragment) that a second roll of the
 * same dice is no more likely to avoid, so it is left for the owner to see.
 */
export function isOnlyHeadlineIsShopName(warnings: readonly StorefrontWarning[]): boolean {
  return (
    warnings.length === 1 &&
    warnings[0].field === 'headline' &&
    warnings[0].issue === 'is only the shop name, which says nothing'
  )
}

/**
 * Whether generateStorefront's one retry should replace the first draft.
 *
 * Fixing the headline is not the only thing that can change between two
 * generations of the same prompt: a second roll of the dice can just as
 * easily invent a claim or write a price into prose, and comparing headlines
 * alone would prefer that draft anyway because it looks past its own new
 * defect. A lie on a real business's public page is the one failure this
 * product cannot recover from, a weak headline is not, so the retry only
 * wins if it actually fixed the headline AND introduced no warning the first
 * draft did not already have. Anything else, keep the first draft.
 */
export function preferRetry(
  first: { headline: string; warnings: readonly StorefrontWarning[] },
  second: { headline: string; warnings: readonly StorefrontWarning[] },
  shopName: string,
): boolean {
  const stillJustTheName = second.headline.trim().toLowerCase() === shopName.trim().toLowerCase()
  if (stillJustTheName) return false
  const key = (warning: StorefrontWarning) => `${warning.field}:${warning.issue}`
  const firstKeys = new Set(first.warnings.map(key))
  const introducedNewWarning = second.warnings.some((warning) => !firstKeys.has(key(warning)))
  return !introducedNewWarning
}
