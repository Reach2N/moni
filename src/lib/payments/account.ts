import 'server-only'
import { db } from '../db.ts'
import { requireDbData, throwIfDbError } from '../db-result.ts'
import {
  KHQR_ACCOUNT_ID,
  KHQR_MERCHANT_FIELD_MAX,
  paymentAccountFor,
  type CurrencyCode,
  type PaymentAccount,
} from '../types.ts'

/**
 * The shop's own Bakong account: read, set, clear.
 *
 * One module because three doors lead here (the /app/money form, the owner
 * agent's `set_payment_account`, and the setup spine's read), and the
 * validation of a pasted account id has to be identical behind all of them. An
 * id that passes here is an id the KHQR builder will happily put in tag 29, so
 * the check IS the product's promise that the QR pays somebody.
 */
export class PaymentAccountError extends Error {
  readonly status = 400
}

export type ShopPaymentSettings = {
  /** What the owner typed, verbatim, for the form to show back. */
  raw: { accountId: string | null; merchantName: string | null; merchantCity: string | null }
  /** What a QR would carry, with fallbacks applied. Null until an id is set. */
  account: PaymentAccount | null
  shopName: string
  currency: CurrencyCode
}

const SELECT = 'name, province, default_currency, khqr_account_id, khqr_merchant_name, khqr_merchant_city'

export async function getPaymentSettings(businessId: string): Promise<ShopPaymentSettings> {
  const row = requireDbData(
    'load payment settings',
    await db.from('businesses').select(SELECT).eq('id', businessId).single(),
  )
  return {
    raw: { accountId: row.khqr_account_id, merchantName: row.khqr_merchant_name, merchantCity: row.khqr_merchant_city },
    account: paymentAccountFor(row),
    shopName: row.name,
    currency: row.default_currency as CurrencyCode,
  }
}

export type SetPaymentAccountInput = {
  accountId: string
  merchantName?: string | null
  merchantCity?: string | null
}

/**
 * Normalise and refuse, in that order. The account id is lowercased because
 * Bakong ids are, and a capital letter from a phone keyboard is the commonest
 * paste mistake. The merchant fields are cut at the EMVCo limit rather than
 * refused: a shop name longer than 25 characters is a real shop name.
 */
export function normalisePaymentAccount(input: SetPaymentAccountInput): SetPaymentAccountInput {
  const accountId = input.accountId.trim().toLowerCase()
  if (!KHQR_ACCOUNT_ID.test(accountId)) {
    throw new PaymentAccountError(
      'A Bakong account looks like name@bank, for example sokha@wing. Copy it from your banking app.',
    )
  }
  const field = (value: string | null | undefined) => {
    const clean = value?.trim() ?? ''
    return clean ? clean.slice(0, KHQR_MERCHANT_FIELD_MAX) : null
  }
  return { accountId, merchantName: field(input.merchantName), merchantCity: field(input.merchantCity) }
}

export async function setPaymentAccount(
  businessId: string,
  input: SetPaymentAccountInput,
  actorLabel: string,
): Promise<ShopPaymentSettings> {
  const clean = normalisePaymentAccount(input)
  const saved = await db
    .from('businesses')
    .update({
      khqr_account_id: clean.accountId,
      khqr_merchant_name: clean.merchantName,
      khqr_merchant_city: clean.merchantCity,
    })
    .eq('id', businessId)
    .select('id')
    .single()
  throwIfDbError('save payment account', saved.error)

  const audit = await db.from('events').insert({
    business_id: businessId,
    actor: 'owner',
    actor_label: actorLabel,
    action: 'payment_account.set',
    entity_type: 'business',
    entity_id: businessId,
    // The account id is the shop's public receiving address, not a secret, and
    // a dispute about where the money went is answered by this row.
    after: { account_id: clean.accountId, merchant_name: clean.merchantName, merchant_city: clean.merchantCity },
  })
  if (audit.error) console.error('[payment account] not audited:', audit.error.message)

  return getPaymentSettings(businessId)
}

export async function clearPaymentAccount(businessId: string, actorLabel: string): Promise<ShopPaymentSettings> {
  const cleared = await db
    .from('businesses')
    .update({ khqr_account_id: null, khqr_merchant_name: null, khqr_merchant_city: null })
    .eq('id', businessId)
  throwIfDbError('clear payment account', cleared.error)
  await db.from('events').insert({
    business_id: businessId,
    actor: 'owner',
    actor_label: actorLabel,
    action: 'payment_account.cleared',
    entity_type: 'business',
    entity_id: businessId,
    after: {},
  })
  return getPaymentSettings(businessId)
}

/**
 * The proof amount for the owner's own scan: small, real, and in the shop's
 * currency. 1,000 riel or 25 cents, both of which every banking app accepts
 * and neither of which anyone minds sending themselves.
 */
export function testChargeMinor(currency: CurrencyCode): number {
  return currency === 'KHR' ? 1000 : 25
}
