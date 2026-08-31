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
import type { ParsedShop } from './parse.ts'

/** Everything that looked wrong enough for a human to check. */
export type ParseWarning = { field: string; issue: string }

/**
 * Guard the failures a schema cannot catch. All three have the same shape: the
 * output is valid JSON and completely wrong.
 */
export function sanityCheck(shop: ParsedShop): ParseWarning[] {
  const w: ParseWarning[] = []
  for (const [i, s] of shop.services.entries()) {
    const at = `services[${i}] "${s.name}"`
    // the 100x bug. 40 riel is not a haircut, and 4,500,000 dollars is not a perm.
    if (s.currency === 'KHR' && s.price_minor > 0 && s.price_minor < 500) {
      w.push({ field: at, issue: `${s.price_minor} KHR is implausibly low, dollars may have been read as riel` })
    }
    if (s.currency === 'USD' && s.price_minor > 100_000) {
      w.push({ field: at, issue: `${s.price_minor} cents is implausibly high, riel may have been read as dollars` })
    }
    if (s.currency !== shop.default_currency) {
      w.push({ field: at, issue: `priced in ${s.currency} but the shop default is ${shop.default_currency}` })
    }
    if (s.duration_min > 24 * 60 && s.unit === 'session') {
      w.push({ field: at, issue: `${s.duration_min} minutes is over a day but the unit is "session"` })
    }
  }
  for (const [i, h] of shop.hours.entries()) {
    if (h.open >= h.close) {
      w.push({ field: `hours[${i}]`, issue: `opens ${h.open} and closes ${h.close}` })
    }
  }
  const days = shop.hours.map((h) => h.dow)
  if (new Set(days).size !== days.length) {
    w.push({ field: 'hours', issue: 'the same weekday appears more than once' })
  }
  return w
}
