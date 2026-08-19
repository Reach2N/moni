/** Shape returned by POST /api/parse. Mirrors ParseResult in lib/ai/parse.ts. */
import type { ParsedShop } from './ai/parse.ts'

export type ParseResponse = {
  shop: ParsedShop
  warnings: { field: string; issue: string }[]
  model: string
  cost_micro_usd: number
  tokens_in: number
  tokens_out: number
}
