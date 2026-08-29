/**
 * The shop's public site, written by the agent and never as markup.
 *
 * Same pattern as `src/lib/ai/parse.ts`: `Output.object` against a zod schema,
 * then a `sanityCheck()` that catches what a schema cannot. The model picks a
 * theme id and fills strings. It never emits HTML, so the worst a bad generation
 * can do is read badly, and a real shop can never receive a white screen.
 *
 * The owner's own words are the source. Inventing an award, a years-in-business
 * claim or a testimonial would be putting a lie on a real business's website,
 * which is the one failure this product cannot recover from.
 */
import { Output, generateText } from 'ai'
import { z } from 'zod'
import { THEMES, type StorefrontContent, type ThemeId } from '@/lib/types.ts'
import { costMicroUsd, withFallback } from './models.ts'
import { sanityCheck, type StorefrontWarning } from './storefront-check.ts'

const THEME_IDS = THEMES.map((theme) => theme.id) as [ThemeId, ...ThemeId[]]

export const StorefrontSchema = z.object({
  theme: z.enum(THEME_IDS).describe('closest match for how this shop actually works'),
  headline: z.string().min(3).max(70).describe("the shop's promise in one line, in the owner's language"),
  subhead: z.string().min(10).max(160),
  about: z.string().min(20).max(600).describe('two or three sentences, from the description only'),
  highlights: z.array(z.string().min(3).max(90)).min(2).max(4),
  callToAction: z.string().min(2).max(40).describe('what the button says, for example "កក់ម៉ោង"'),
  notice: z.string().max(160).nullable().describe('only if the owner stated one, otherwise null'),
})

const SYSTEM = `You write the public web page for a small business in Cambodia, using only what the owner already told us. You fill fields. You never write HTML, markdown or CSS.

Rules:
- Write in the language the owner used. Khmer stays in Khmer script.
- Use ONLY facts present in the shop description, services and hours you are given.
- Never invent an award, a rating, a testimonial, a years-in-business claim, a discount, a delivery option or a location detail. If it was not said, it does not go on the page.
- Never state a price. Prices are rendered from the database beside your text, and one that disagrees is worse than none.
- Keep it plain. A shop owner should recognise their own shop, not an advertisement.
- highlights are short factual phrases, for example "បើកទាំងថ្ងៃសៅរ៍" or "បុគ្គលិកពីរនាក់".
- notice is null unless the owner stated something time bound, like a closure.
- Never write an em dash. Use a comma or a full stop.

Choose the theme by how the business runs: salon for services on a chair, stay for rooms by the night, workshop for jobs left and collected, counter for walk in ordering.`

/** Re-exported from a module with no AI SDK import, so db/test.mjs can prove it. */
export { sanityCheck }
export type { StorefrontWarning }

export type GeneratedStorefront = {
  content: StorefrontContent
  warnings: StorefrontWarning[]
  model: string
  cost_micro_usd: number
}

export async function generateStorefront(input: {
  shopName: string
  businessType: string
  rawDescription: string | null
  aiInstructions: string | null
  services: Array<{ name: string; nameEn: string | null; durationMin: number; unit: string }>
  hours: Array<{ dow: number; open: string; close: string }>
}): Promise<GeneratedStorefront> {
  const brief = [
    `Shop name: ${input.shopName}`,
    `Kind of business: ${input.businessType}`,
    input.rawDescription ? `The owner's own description: ${input.rawDescription}` : null,
    input.aiInstructions ? `Standing instructions from the owner: ${input.aiInstructions}` : null,
    input.services.length
      ? `Services offered (names only, no prices): ${input.services.map((s) => s.name).join(', ')}`
      : 'No services recorded yet.',
    input.hours.length
      ? `Open on weekdays (0 is Sunday): ${input.hours.map((h) => `${h.dow} ${h.open} to ${h.close}`).join('; ')}`
      : 'No opening hours recorded.',
  ]
    .filter(Boolean)
    .join('\n')

  const { result, ref } = await withFallback('parse', (model) =>
    generateText({
      model,
      system: SYSTEM,
      prompt: brief,
      output: Output.object({ schema: StorefrontSchema }),
      temperature: 0.4,
    }),
  )

  const content = result.output as StorefrontContent
  const tokensIn = result.usage?.inputTokens ?? 0
  const tokensOut = result.usage?.outputTokens ?? 0

  return {
    content,
    warnings: sanityCheck(content, input.shopName),
    model: ref,
    cost_micro_usd: costMicroUsd(ref, tokensIn, tokensOut),
  }
}
