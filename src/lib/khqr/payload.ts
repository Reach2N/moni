import { createHash } from 'node:crypto'
import type { CurrencyCode } from '../types.ts'

/**
 * The EMVCo/KHQR payload, built offline.
 *
 * `src/lib/payments.ts` takes `buildPayload` and `md5` as injected functions and
 * deliberately did not implement them. This is that implementation, and it is
 * the one piece of this product a customer's banking app parses directly: if a
 * length prefix or the CRC is wrong, the scan fails in a shop, in front of a
 * customer, and nothing in our logs says why.
 *
 * So it is cross checked. `db/test.mjs` generates the same payment through this
 * builder and through `ts-khqr` and asserts the strings are identical, byte for
 * byte, including the CRC. A divergence means one of us is wrong and you want to
 * find out on a laptop rather than at a counter. ts-khqr is a devDependency for
 * that test only: a second opinion, not a runtime dependency.
 *
 * Generation is offline on purpose. Verification is the only part that needs the
 * network, and it goes through the Cambodian relay because NBC blocks
 * check-transaction from servers outside Cambodia and Vercel is not in Cambodia.
 */

/** EMVCo tags, in the order KHQR emits them. Order is part of the format. */
const TAG = {
  PAYLOAD_FORMAT: '00',
  INITIATION_METHOD: '01',
  INDIVIDUAL: '29',
  MERCHANT: '30',
  CATEGORY_CODE: '52',
  CURRENCY: '53',
  AMOUNT: '54',
  COUNTRY: '58',
  MERCHANT_NAME: '59',
  MERCHANT_CITY: '60',
  ADDITIONAL_DATA: '62',
  TIMESTAMP: '99',
  CRC: '63',
} as const

const CURRENCY_NUMERIC: Record<CurrencyCode, string> = { KHR: '116', USD: '840' }

/**
 * "Dynamic" means one payment, one QR. A static QR (11) is a shop's printed
 * sign; every charge this product creates is for one amount and one reference,
 * so it is always 12.
 */
const DYNAMIC = '12'

/** Tag, then a TWO digit length, then the value. A three digit length is a different format. */
function tlv(tag: string, value: string): string {
  const length = String(value.length).padStart(2, '0')
  if (value.length > 99) throw new Error(`KHQR field ${tag} is too long (${value.length})`)
  return `${tag}${length}${value}`
}

/**
 * CRC-16/CCITT-FALSE: polynomial 0x1021, initial value 0xFFFF, no reflection,
 * no final xor. Computed over the whole payload INCLUDING the literal "6304"
 * that introduces the checksum itself, which is the detail that catches people.
 */
export function crc16(input: string): string {
  let crc = 0xffff
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * Minor units to the string the QR carries.
 *
 * KHR has no decimals, so 15000 riel is "15000". USD has two, so 1500 is "15".
 * Trailing zeros are dropped because that is what the reference implementation
 * emits, and this string is compared byte for byte against it.
 */
export function amountField(amountMinor: number, currency: CurrencyCode): string {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new Error(`KHQR amount must be a non-negative integer in minor units, got ${amountMinor}`)
  }
  if (currency === 'KHR') return String(amountMinor)
  const major = amountMinor / 100
  return String(Number(major.toFixed(2)))
}

export type KhqrConfig = {
  /** The Bakong account id, e.g. "sokha@wing". BAKONG_ACCOUNT in the environment. */
  accountId: string
  merchantName: string
  merchantCity: string
  /** Bakong individual accounts use tag 29; registered merchants use 30. */
  kind?: 'individual' | 'merchant'
  merchantCategoryCode?: string
  countryCode?: string
}

export type KhqrRequest = {
  amount_minor: number
  currency: CurrencyCode
  /** Our own reference the customer may see, such as the booking code. */
  reference: string
  /** Injected so the payload is deterministic and therefore testable. */
  createdAtMs?: number
  expiresAtMs?: number
}

export function buildKhqrPayload(config: KhqrConfig, request: KhqrRequest): string {
  const createdAt = request.createdAtMs ?? Date.now()
  const expiresAt = request.expiresAtMs ?? createdAt + 5 * 60 * 1000

  const account = tlv(
    config.kind === 'merchant' ? TAG.MERCHANT : TAG.INDIVIDUAL,
    tlv('00', config.accountId),
  )
  const additional = tlv(TAG.ADDITIONAL_DATA, tlv('01', request.reference))
  // Two 13 digit epoch milliseconds: when it was made, and when it lapses.
  const timestamp = tlv(
    TAG.TIMESTAMP,
    tlv('00', String(createdAt)) + tlv('01', String(expiresAt)),
  )

  const body =
    tlv(TAG.PAYLOAD_FORMAT, '01') +
    tlv(TAG.INITIATION_METHOD, DYNAMIC) +
    account +
    tlv(TAG.CATEGORY_CODE, config.merchantCategoryCode ?? '5999') +
    tlv(TAG.CURRENCY, CURRENCY_NUMERIC[request.currency]) +
    tlv(TAG.AMOUNT, amountField(request.amount_minor, request.currency)) +
    tlv(TAG.COUNTRY, config.countryCode ?? 'KH') +
    tlv(TAG.MERCHANT_NAME, config.merchantName) +
    tlv(TAG.MERCHANT_CITY, config.merchantCity) +
    additional +
    timestamp

  // The CRC covers the tag and length of the CRC field itself.
  const withCrcHeader = `${body}${TAG.CRC}04`
  return `${withCrcHeader}${crc16(withCrcHeader)}`
}

/**
 * The handle the relay verifies by. Bakong identifies a transaction by the md5
 * of the QR string, which is why `payments.ts` stores it as `provider_ref`.
 */
export function khqrMd5(payload: string): string {
  return createHash('md5').update(payload, 'utf8').digest('hex')
}
