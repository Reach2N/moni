/**
 * Turn a shop owner's plain language description into structured rows.
 *
 * This is the one call the whole product rests on: it is the demo moment and the
 * only onboarding step. So it is defensive in three specific places, each of
 * which is a bug that would show up on stage rather than in a log.
 */
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { BOOKING_UNITS, BUSINESS_TYPES, CURRENCIES } from '../types.ts'
import { costMicroUsd, withFallback } from './models.ts'
import { sanityCheck, type ParseWarning } from './sanity.ts'

const CURRENCY_CODES = Object.keys(CURRENCIES) as [string, ...string[]]
const TYPE_IDS = BUSINESS_TYPES.map((t) => t.id) as [string, ...string[]]

const ParsedService = z.object({
  name: z.string().min(1).describe("service name exactly as the owner wrote it, Khmer included"),
  name_en: z.string().nullable().describe('English name if the owner did not already write one'),
  price_minor: z
    .number()
    .int()
    .min(0)
    .describe('integer MINOR units. KHR has no decimals so 15000 riel is 15000. USD has 2 so $15 is 1500'),
  currency: z.enum(CURRENCY_CODES),
  duration_min: z.number().int().positive().describe('minutes. "one and a half hours" is 90'),
  buffer_min: z.number().int().min(0).describe('cleanup or turnaround time after, 0 if not stated'),
  unit: z.enum(BOOKING_UNITS as unknown as [string, ...string[]]),
})

const ParsedHours = z.object({
  dow: z.number().int().min(0).max(6).describe('0 is Sunday'),
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
})

export const ParsedShop = z.object({
  name: z
    .string()
    .nullable()
    .describe('the shop name if the owner stated one, otherwise null. Never the owner\'s own name'),
  business_type: z.enum(TYPE_IDS).describe('closest match from the list'),
  default_currency: z.enum(CURRENCY_CODES),
  // Deliberately no .min(1). An owner who opens with an intent ("I want to
  // start a coffee shop") has named no service, and the system prompt forbids
  // inventing one, so a floor here makes the two rules contradict: the model
  // obeys the prompt, zod rejects the object, and the AI SDK raises
  // NoObjectGeneratedError, which is not retryable and reaches the owner as a
  // 502 that says try again and never succeeds. An empty catalogue is a valid
  // FIRST answer; `SetupRequestSchema` still enforces min(1) on the way into
  // the database, so nothing incomplete can be saved.
  services: z.array(ParsedService),
  hours: z.array(ParsedHours).describe('omit a day entirely if the shop is closed that day'),
  resource_count: z
    .number()
    .int()
    .min(1)
    .describe('how many staff, rooms, chairs or bays were mentioned. 1 if not stated'),
  notes: z.string().nullable().describe('anything said that did not fit a field above'),
})
export type ParsedShop = z.infer<typeof ParsedShop>

const SYSTEM = `You read how a small business owner in Cambodia describes their shop, and turn it into structured data. You are not a chatbot and you never address the user.

Money, and this is the rule that matters most:
- Output integer MINOR units with the currency alongside.
- KHR has NO decimal places. "15000៛" and "15,000 riel" are both price_minor 15000, currency KHR.
- USD has 2. "$15" and "15 dollars" are both price_minor 1500, currency USD.
- Never convert between currencies. Record what was written.
- A shop that names riel anywhere is a KHR shop unless it clearly prices in dollars.

Khmer:
- Khmer numerals are digits: ០១២៣៤៥៦៧៨៩ map to 0123456789. "១៥០០០" is 15000.
- Keep the service name in the owner's own words and script. Fill name_en yourself.
- Read Khmer durations properly: "១ម៉ោង" is 60, "១ម៉ោងកន្លះ" is 90, "៣០ នាទី" is 30.
- Khmer weekday names: អាទិត្យ Sunday, ចន្ទ Monday, អង្គារ Tuesday, ពុធ Wednesday, ព្រហស្បតិ៍ Thursday, សុក្រ Friday, សៅរ៍ Saturday.

Durations and units:
- Guess a sensible duration if none is stated, based on the kind of service.
- unit is "night" for hotel and guesthouse rooms, "hour" for anything hired by the hour, "day" for jobs collected another day such as tailoring, "walk_in" where there is no appointment, otherwise "session".
- buffer_min is only for stated cleanup or turnaround time. Otherwise 0.

Hours:
- 24 hour "HH:MM". "8am to 7pm" is 08:00 to 19:00.
- Leave a closed day out of the array entirely rather than setting equal times.
- If no hours are given at all, return an empty array. Do not invent them.

What to do when the owner has not said much yet:
- An owner may only state an intent, such as "I want to open a coffee shop". That is a valid input, not an error.
- Return an EMPTY services array when no service was named. An empty array is the correct answer. Never fill it to look complete.
- Return an empty hours array the same way when no opening times were given.
- Set name only if the owner named the shop. An owner's personal name is not a shop name, so leave it null.
- default_currency is KHR unless the owner clearly prices in dollars.
- business_type is still your best guess from whatever was said.

Never use an em dash in any text you output. Use a comma or a full stop.
Do not invent services, prices or opening hours that were not stated or clearly implied.`

/** Re-exported from a module with no AI SDK import, so a client component can run it. */
export { sanityCheck }
export type { ParseWarning }

export type ParseResult = {
  shop: ParsedShop
  warnings: ParseWarning[]
  model: string
  cost_micro_usd: number
  tokens_in: number
  tokens_out: number
}

export async function parseShop(text: string): Promise<ParseResult> {
  const trimmed = text.trim()
  if (trimmed.length < 8) throw new Error('too short to parse')
  if (trimmed.length > 8000) throw new Error('too long, keep it under 8000 characters')

  const { result, ref } = await withFallback('parse', (model) =>
    generateText({
      model,
      system: SYSTEM,
      prompt: trimmed,
      output: Output.object({ schema: ParsedShop }),
      temperature: 0,
      maxRetries: 1,
    }),
  )

  const shop = result.output
  const tokens_in = result.usage?.inputTokens ?? 0
  const tokens_out = result.usage?.outputTokens ?? 0

  return {
    shop,
    warnings: sanityCheck(shop),
    model: ref,
    tokens_in,
    tokens_out,
    cost_micro_usd: costMicroUsd(ref, tokens_in, tokens_out),
  }
}
