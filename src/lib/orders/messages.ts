import type { OrderError } from './create.ts'

/**
 * What a customer reads when her order was refused.
 *
 * `OrderError`'s own messages are written for the owner and for a log. On the
 * public shop site the reader is the customer, in Khmer, and she needs to know
 * which of the four things happened because she can act on two of them (pick
 * something else, or order fewer) and not on the other two.
 *
 * Pure and no `server-only`: the route imports it, the storefront imports it,
 * and `db/test.mjs` proves every code has a sentence. A missing code would
 * otherwise surface as an empty red box on a real shop's site.
 */
const KM: Record<OrderError['code'], string> = {
  empty: 'សូមជ្រើសរើសយ៉ាងតិចមួយមុខសិន។',
  unknown_product: 'មុខទំនិញនេះលែងមានលក់នៅហាងនេះហើយ។',
  out_of_stock: 'សូមអភ័យទោស ទំនិញនេះនៅសល់មិនគ្រប់ទេ។ សូមកាត់បន្ថយចំនួន។',
  mixed_currency: 'ការបញ្ជាទិញមួយមិនអាចលាយរូបិយប័ណ្ណពីរបានទេ។',
}

/** The fallback is deliberate: an unknown code must still read as a sentence. */
export function orderErrorKm(code: string): string {
  return KM[code as OrderError['code']] ?? 'ការបញ្ជាទិញនេះមិនបានសម្រេចទេ។ សូមព្យាយាមម្ដងទៀត។'
}

/** The HTTP status for a refusal. Out of stock is the request the world moved under. */
export function orderErrorStatus(code: string): number {
  return code === 'out_of_stock' ? 409 : 400
}
