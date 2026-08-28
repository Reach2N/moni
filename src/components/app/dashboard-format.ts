/**
 * Presentation helpers for the owner surface.
 *
 * The numeral and money formatters used to be defined here AND in `lib/demo.ts`,
 * two copies of the same Intl traps. They now live in `lib/format/khmer.ts` and
 * are re-exported so component imports stay short and there is one place where
 * the rules can be got wrong.
 */
export {
  durationKm,
  khmerDayLabel,
  khmerNumber,
  khmerWeekday,
  minutesToKhmerTime,
  moneyKm,
  moneyTotalKm,
  toKhmerDigits,
} from '@/lib/format/khmer.ts'
export { cambodiaMinutesOfDay as cambodiaMinutes, parseClock } from '@/lib/time/cambodia.ts'

import { toKhmerDigits } from '@/lib/format/khmer.ts'
import { CAMBODIA_TIME_ZONE } from '@/lib/time/cambodia.ts'

/** Wall clock time in the shop's own time zone, 24 hour, Latin digits in, Khmer out. */
export function cambodiaTime(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: CAMBODIA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

export function relativeCambodiaTime(iso: string) {
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (elapsedMinutes < 1) return 'ឥឡូវនេះ'
  if (elapsedMinutes < 60) return `${toKhmerDigits(elapsedMinutes)} នាទីមុន`
  const hours = Math.floor(elapsedMinutes / 60)
  if (hours < 24) return `${toKhmerDigits(hours)} ម៉ោងមុន`
  return `${toKhmerDigits(Math.floor(hours / 24))} ថ្ងៃមុន`
}

/**
 * Why Moni handed a conversation back, in the owner's language.
 *
 * The reason is written by the model, in English, and it frequently quotes the
 * shop's own Khmer back inside that English: "a discount on Perm (សក់អ៊ុត) from
 * 60,000៛ to 40,000៛". The previous guard returned any string containing a Khmer
 * character untouched, so exactly those mixed strings, the most common kind,
 * reached a non technical Khmer owner as English prose carrying Latin digits.
 * Two defects in one line: unreadable copy, and the numeral system mixed on the
 * surface that pins it hardest.
 *
 * So the test is for Latin WORDS, not for the absence of Khmer, and the rewrite
 * keeps the facts the sentence was carrying: the amounts, and the service the
 * customer is asking about.
 */
const LATIN_WORD = /[A-Za-z]{3,}/
const MONEY_TOKEN = /\$\s?\d[\d,]*(?:\.\d{1,2})?|\d[\d,]*(?:\.\d{1,2})?\s?៛/g
const KHMER_RUN = /[ក-៓]+/g

export function ownerReasonKm(reason: string) {
  const trimmed = reason.trim()
  if (!trimmed) return 'Moni បានផ្ទេរសន្ទនានេះមកអ្នក។'
  if (!LATIN_WORD.test(trimmed)) return toKhmerDigits(trimmed)

  const amounts = (trimmed.match(MONEY_TOKEN) ?? []).map((token) => toKhmerDigits(token.replace(/\s+/g, '')))
  // The longest Khmer run is the service the customer named. Single characters
  // are stray marks, not words.
  const named = (trimmed.match(KHMER_RUN) ?? []).filter((run) => run.length > 1).toSorted((a, b) => b.length - a.length)[0]
  const about = named ? ` ${named}` : ''
  const normalized = trimmed.toLocaleLowerCase('en')

  if (/discount|below (?:the )?(?:listed )?price|cheaper|haggl|bargain/.test(normalized)) {
    return amounts.length >= 2
      ? `អតិថិជនសុំបញ្ចុះតម្លៃ${about} ពី ${amounts[0]} មក ${amounts[1]}។ អ្នកជាអ្នកសម្រេច។`
      : `អតិថិជនសុំបញ្ចុះតម្លៃ${about} ក្រោមតម្លៃដែលអ្នកបានកំណត់។ អ្នកជាអ្នកសម្រេច។`
  }
  if (/refund|money back|chargeback/.test(normalized)) {
    return `អតិថិជនសុំសងប្រាក់វិញ${about ? ` សម្រាប់${named}` : ''}។ អ្នកជាអ្នកសម្រេច។`
  }
  if (/complain|angry|upset|unhappy|bad service|rude/.test(normalized)) {
    return 'អតិថិជនមិនពេញចិត្តនឹងសេវា ហើយចង់និយាយជាមួយម្ចាស់ហាងផ្ទាល់។'
  }
  if (/medical|allerg|health|injur|pregnan|skin condition/.test(normalized)) {
    return `អតិថិជនសួរអំពីសុខភាព${about}។ Moni មិនឆ្លើយសំណួរបែបនេះជំនួសអ្នកទេ។`
  }
  if (/cancel|reschedul|change (?:the )?(?:time|booking)|postpone/.test(normalized)) {
    return `អតិថិជនចង់ប្តូរ ឬលុបការណាត់${about}។ សូមបញ្ជាក់ម៉ោងថ្មីជាមួយគាត់។`
  }
  if (/wholesale|bulk|group|event|party|many people/.test(normalized)) {
    return 'អតិថិជនសុំកក់ជាក្រុមធំ ដែលលើសពីអ្វីដែល Moni អាចសម្រេចបាន។'
  }
  if (/not (?:in|on) (?:the )?(?:menu|list)|do (?:not|n.t) offer|unavailable service|no such service/.test(normalized)) {
    return `អតិថិជនសុំសេវាដែលមិនមានក្នុងបញ្ជីរបស់អ្នក${about}។ ប្រាប់ Moni បើអ្នកចង់បន្ថែមវា។`
  }
  return 'Moni មិនប្រាកដចិត្តនឹងសំណើនេះ ទើបទុកឱ្យអ្នកឆ្លើយផ្ទាល់។'
}
