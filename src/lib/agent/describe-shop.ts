import 'server-only'
import { tool } from 'ai'
import { z } from 'zod'
import { parseShop } from '../ai/parse.ts'
import { buildShopProposal } from './proposal.ts'

/**
 * The one owner tool that PROPOSES instead of doing, in a module with nothing
 * to do it with.
 *
 * WHY IT LIVES ALONE. Rewriting a whole business profile, its hours and its
 * catalogue from one sentence is the widest blast radius in the product and the
 * only owner action that can silently overwrite everything at once. A price
 * change is one row and is visibly wrong the next time she looks. A bad
 * re-parse is not: it retires services the sentence did not mention, moves the
 * shop's type and currency, and replaces the opening hours, all under one
 * confident summary. So it stops for her, and `/api/setup` runs `persistSetup`
 * only after she approves.
 *
 * WHY IT IS A FILE AND NOT A COMMENT. This tool used to sit inline in
 * `owner-tools.ts`, next to `createProduct`, `setPaymentAccount`,
 * `publishShopSite` and the database handle itself, and the only thing keeping
 * a writer out of it was a promise in prose plus a grep in `db/test.mjs` over
 * the text of the tool body. That grep was defeated on 3 September 2026 by
 * adding one `await createProduct(...)` call, which the suite did not notice,
 * because every writer was already imported one scope up.
 *
 * Here there is nothing to reach for. This module imports the parser and the
 * proposal builder and NOTHING else, so `describe_shop` cannot write because it
 * has no writer, no database handle and no transaction in scope, not because a
 * comment says it must not. `db/test.mjs` walks this module's real import graph
 * and goes red the moment anything that can reach `src/lib/db.ts` enters it,
 * and it asserts that `owner-tools.ts` wires this constant in rather than
 * growing a body of its own again.
 *
 * `businessId` is not a parameter for the same reason: the tool has no id to
 * write against, so it is exported as one constant rather than a factory.
 */
export const describeShopTool = tool({
  description:
    'SETUP. The owner describes her whole shop in ordinary language: what she sells, prices, opening hours, how many staff or rooms. Read it into a shop profile, hours and a catalogue. Use for "I run a coffee shop on street 271, iced coffee is 6000 riel, open 7 to 6", or when she is starting from nothing, or when she wants her shop read again from a fresh description. This tool PROPOSES: it saves nothing, and the owner approves the proposal before anything is written. Do not use it to add one item or change one price, those are create_product, create_products_bulk, update_product, update_service and adjust_prices, and those act immediately.',
  inputSchema: z.object({
    description: z
      .string()
      .trim()
      .min(8)
      .max(8_000)
      .describe("the owner's own words about her shop, verbatim, in her own language and script. Never a summary you wrote"),
  }),
  execute: async ({ description }) => {
    try {
      const parsed = await parseShop(description)
      return buildShopProposal({
        rawDescription: description,
        parsed: parsed.shop,
        model: parsed.model,
        warnings: parsed.warnings,
      })
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'could not read that description' }
    }
  },
})
