/**
 * What `describe_shop` hands back instead of writing.
 *
 * WHY THIS TOOL ALONE IS GATED. Every other owner tool acts immediately:
 * adding a product, moving a price, publishing the page. Rewriting a whole
 * business profile, its hours and its catalogue from one sentence is the
 * widest blast radius in the product and the only action that can silently
 * overwrite everything at once. A price change is one row and is visibly
 * wrong the next time she looks at it. A bad re-parse is not: it retires
 * services the sentence did not happen to mention, moves the shop's type and
 * currency, and replaces the opening hours, all under one confident summary.
 * So this module turns a parse into a PROPOSAL, the owner approves it, and
 * only then does `/api/setup` run `persistSetup`. Commit 315e126 put that gate
 * on the setup screen; moving setup into the one prompt does not get to drop
 * it.
 *
 * Pure on purpose: no `server-only`, no database, no AI SDK. `db/test.mjs`
 * imports it to prove the tool proposes rather than writes, and `ask-moni.tsx`
 * imports it to narrow a tool result in the browser. Same reason
 * `src/lib/agent/instructions.ts` sits beside `prompt.ts`.
 */
import { catalogueCounts, catalogueZeroKind } from '../setup/catalogue-count.ts'
import { formatMoney, type CurrencyCode } from '../types.ts'

/** A parsed catalogue row, structurally. Typed here rather than imported from
 * `ai/parse.ts` so this file pulls in neither the AI SDK nor `models.ts`. */
export type ProposedRow = {
  name: string
  name_en: string | null
  price_minor: number
  currency: string
  unit: string
  duration_min: number
  buffer_min: number
}

export type ProposedShop = {
  name: string | null
  business_type: string
  default_currency: string
  services: readonly ProposedRow[]
  hours: readonly { dow: number; open: string; close: string }[]
  resource_count: number
  notes: string | null
}

/**
 * Codes, not sentences. The owner reads these in Khmer on the approval card
 * and the model reads the same list to know what to ask her for next, so the
 * decision lives here once and the wording lives at each surface.
 */
export type ShopProposalBlocker = 'no_catalogue' | 'unnamed_row' | 'unpriced_row'

export type ShopProposalLine = { name: string; price: string; unpriced: boolean }

/** Exactly the body `POST /api/setup` validates with `SetupRequestSchema`. */
export type ShopSetupRequestBody = {
  raw_description: string
  model?: string
  business?: { name: string }
  shop: {
    business_type: string
    default_currency: string
    hours: readonly { dow: number; open: string; close: string }[]
    resource_count: number
    notes: string | null
    services: Array<
      ProposedRow & {
        description: null
        capacity: 1
        requires_deposit: false
        deposit_minor: null
      }
    >
  }
}

export const SHOP_PROPOSAL_KIND = 'shop_proposal'

export type ShopProposal = {
  kind: typeof SHOP_PROPOSAL_KIND
  /** Always false. This tool has no database call to set it true with. */
  applied: false
  awaiting_owner_approval: true
  ready: boolean
  blockers: ShopProposalBlocker[]
  summary: {
    shop_name: string | null
    business_type: string
    currency: string
    services: number
    products: number
    kind_if_empty: 'service' | 'product'
    open_days: number
    resource_count: number
  }
  lines: ShopProposalLine[]
  warnings: Array<{ field: string; issue: string }>
  setup_request: ShopSetupRequestBody
  note: string
}

const asCurrencyCode = (currency: string): CurrencyCode => (currency === 'USD' ? 'USD' : 'KHR')

export function buildShopProposal(input: {
  rawDescription: string
  parsed: ProposedShop
  model?: string
  warnings?: ReadonlyArray<{ field: string; issue: string }>
}): ShopProposal {
  const { parsed } = input
  const rows = parsed.services

  // The same three gates the setup screen puts in front of its own save
  // button, because they are the same schema and the same expensive mistake:
  // `SetupRequestSchema` rejects an empty catalogue and a blank name outright,
  // and a zero price reaches a customer as "the coffee is free" the moment the
  // customer agent quotes `services.price_minor` back.
  const blockers: ShopProposalBlocker[] = []
  if (rows.length === 0) {
    blockers.push('no_catalogue')
  } else {
    if (rows.some((row) => !row.name.trim())) blockers.push('unnamed_row')
    if (rows.some((row) => row.price_minor === 0)) blockers.push('unpriced_row')
  }

  const counts = catalogueCounts(parsed.business_type, rows)
  const name = parsed.name?.trim() ?? ''

  return {
    kind: SHOP_PROPOSAL_KIND,
    applied: false,
    awaiting_owner_approval: true,
    ready: blockers.length === 0,
    blockers,
    summary: {
      shop_name: name || null,
      business_type: parsed.business_type,
      currency: parsed.default_currency,
      services: counts.services,
      products: counts.products,
      kind_if_empty: catalogueZeroKind(parsed.business_type),
      open_days: parsed.hours.length,
      resource_count: parsed.resource_count,
    },
    lines: rows.map((row) => ({
      name: row.name,
      price: formatMoney(row.price_minor, asCurrencyCode(row.currency)),
      unpriced: row.price_minor === 0,
    })),
    warnings: (input.warnings ?? []).map((warning) => ({ field: warning.field, issue: warning.issue })),
    setup_request: {
      // Rule 8: `raw_description` is never overwritten with a tidied version of
      // itself. What the owner actually said goes in verbatim, because it is
      // the parse input, the re-parse source and the best training data this
      // product will have. A re-parse rewrites the catalogue, not the source.
      raw_description: input.rawDescription,
      ...(input.model ? { model: input.model } : {}),
      // Only when she named the shop. Absent leaves the stored name alone, so
      // describing the menu again never renames the business.
      ...(name ? { business: { name } } : {}),
      // `ai_instructions` is absent on purpose, not null: absent leaves her
      // standing instructions alone, null would clear them, and describing a
      // shop is not a decision about how the assistant should talk.
      shop: {
        business_type: parsed.business_type,
        default_currency: parsed.default_currency,
        hours: parsed.hours,
        resource_count: parsed.resource_count,
        notes: parsed.notes,
        services: rows.map((row) => ({
          ...row,
          description: null,
          capacity: 1,
          requires_deposit: false,
          deposit_minor: null,
        })),
      },
    },
    note: 'Nothing has been saved. Read this back to the owner and let her confirm on the approval card, or take a correction and call describe_shop again.',
  }
}

/** Narrows an untyped tool result in the browser, where `steps[].result` is JSON. */
export function isShopProposal(value: unknown): value is ShopProposal {
  if (value === null || typeof value !== 'object') return false
  const candidate = value as Partial<ShopProposal>
  return (
    candidate.kind === SHOP_PROPOSAL_KIND &&
    candidate.applied === false &&
    typeof candidate.setup_request === 'object' &&
    candidate.setup_request !== null
  )
}
