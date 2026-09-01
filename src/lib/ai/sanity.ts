/**
 * Plausibility checks on a parsed shop, as a pure function.
 *
 * This is a sibling of `parse.ts`, not a part of it, for the same reason
 * `src/lib/auth/gate.ts` sits beside `member.ts` and `src/lib/agent/instructions.ts`
 * sits beside `prompt.ts`: `parse.ts` imports the `ai` SDK and `./models.ts`, and
 * `models.ts` is the only file allowed to name a model or provider, so neither
 * belongs in a browser bundle. `sanityCheck` has to run twice: once on the server
 * right after the model answers, and again in the browser every time the owner
 * edits a row, so a correction clears its own warning instead of leaving it
 * stranded under a value that is no longer wrong. Only the second call site needs
 * this file to be importable from a client component, which is the whole reason
 * it was split out.
 */
import type { CurrencyCode } from '../types.ts'
import { durationKm, moneyKm, toKhmerDigits } from '../format/khmer.ts'
import type { ParsedShop } from './parse.ts'

/** Everything that looked wrong enough for a human to check. */
export type ParseWarning = { field: string; issue: string }

/** `src/lib/format/khmer.ts` is documented client safe: no `server-only`, no AI
 * SDK, no `models.ts`. `sanityCheck` runs a second time in the browser on every
 * edit (see the module comment above), so its messages render straight onto the
 * review screen, in Khmer, with money read through `moneyKm` like every other
 * amount on that screen. */
const currencyLabel = (currency: CurrencyCode) => (currency === 'USD' ? 'USD' : '៛')

// `ParsedShop`'s currency fields are `z.enum(CURRENCY_CODES)` built from
// `Object.keys(CURRENCIES)`, which zod and TypeScript both widen to `string`,
// not the `CurrencyCode` union `moneyKm` needs. The narrowing ternary is the
// same one `shop-setup.tsx` already uses when it reads a parsed service's
// currency, so both call sites treat "not USD" as KHR the same way.
const asCurrencyCode = (currency: string): CurrencyCode => (currency === 'USD' ? 'USD' : 'KHR')

/**
 * Guard the failures a schema cannot catch. All three have the same shape: the
 * output is valid JSON and completely wrong.
 */
export function sanityCheck(shop: ParsedShop): ParseWarning[] {
  const w: ParseWarning[] = []
  // An owner who opened with an intent rather than a description gets here with
  // nothing in the catalogue. That is no longer a parse failure (see the comment
  // on ParsedShop.services), so it has to become a thing the review screen ASKS
  // for. This warning and the empty-hours one below are the whole difference
  // between "Moni could not read your shop" and "Moni needs two more facts".
  if (shop.services.length === 0) {
    w.push({ field: 'services', issue: 'មិនទាន់មានសេវា។ ប្រាប់ខ្ញុំពីសេវា និងតម្លៃ មុនពេលរក្សាទុក' })
  }
  if (shop.hours.length === 0) {
    w.push({ field: 'hours', issue: 'មិនទាន់មានម៉ោងបើក។ Moni នឹងមិនប្រាប់អតិថិជនពីម៉ោងទេ' })
  }
  for (const [i, s] of shop.services.entries()) {
    const at = `services[${i}] "${s.name}"`
    const amount = moneyKm(s.price_minor, asCurrencyCode(s.currency))
    // A price of zero means the owner never said one, because the model is told
    // not to invent prices. It must never reach the catalogue unnoticed: the
    // agent quotes services.price_minor verbatim, so a zero saved here is Moni
    // telling a customer the coffee is free. This is the single most expensive
    // thing this file can catch.
    if (s.price_minor === 0) {
      w.push({ field: at, issue: 'មិនទាន់មានតម្លៃ។ សូមបញ្ចូលតម្លៃមុនពេលរក្សាទុក' })
    }
    // the 100x bug. 40 riel is not a haircut, and 4,500,000 dollars is not a perm.
    if (s.currency === 'KHR' && s.price_minor > 0 && s.price_minor < 500) {
      w.push({ field: at, issue: `${amount} ទាបពេក ប្រហែលជាដុល្លារត្រូវបានយល់ច្រឡំជារៀល` })
    }
    if (s.currency === 'USD' && s.price_minor > 100_000) {
      w.push({ field: at, issue: `${amount} ខ្ពស់ពេក ប្រហែលជារៀលត្រូវបានយល់ច្រឡំជាដុល្លារ` })
    }
    if (s.currency !== shop.default_currency) {
      w.push({
        field: at,
        issue: `កំណត់តម្លៃជា ${currencyLabel(asCurrencyCode(s.currency))} ប៉ុន្តែរូបិយប័ណ្ណលំនាំដើមរបស់ហាងគឺ ${currencyLabel(asCurrencyCode(shop.default_currency))}`,
      })
    }
    if (s.duration_min > 24 * 60 && s.unit === 'session') {
      w.push({ field: at, issue: `រយៈពេល ${durationKm(s.duration_min)} លើសពីមួយថ្ងៃ ប៉ុន្តែសេវានេះជាកក់ម្តងៗ (session)` })
    }
  }
  for (const [i, h] of shop.hours.entries()) {
    if (h.open >= h.close) {
      w.push({ field: `hours[${i}]`, issue: `ម៉ោងបើក ${toKhmerDigits(h.open)} ក្រោយម៉ោងបិទ ${toKhmerDigits(h.close)}` })
    }
  }
  const days = shop.hours.map((h) => h.dow)
  if (new Set(days).size !== days.length) {
    w.push({ field: 'hours', issue: 'ថ្ងៃដដែលកើតឡើងច្រើនជាងម្តងក្នុងបញ្ជីម៉ោងបើក' })
  }
  return w
}
