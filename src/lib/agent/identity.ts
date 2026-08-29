/**
 * How a person on a channel becomes a row.
 *
 * `customer_identities` is unique on (channel, external_id) GLOBALLY, not per
 * business. Without a tenant in the key, one Telegram user messaging two shops
 * would collapse into a single customer row and each shop would read the other's
 * conversation. The web chat solved this with a slug prefix before there was a
 * second channel; every channel does it the same way now.
 *
 * No `server-only` here on purpose: it is the rule that keeps two shops apart,
 * so `db/test.mjs` has to be able to import and prove it.
 */
export function scopedExternalId(businessId: string, channelUserId: string | number): string {
  return `${businessId}:${channelUserId}`
}
