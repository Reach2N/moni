import 'server-only'
import { db } from '../db.ts'
import { throwIfDbError } from '../db-result.ts'

export type InvoiceDocument = {
  number: number
  issuedAt: string
  totalMinor: number
  currency: string
  businessName: string
  businessSlug: string
  businessAddress: string | null
  businessPhone: string | null
  customerName: string | null
  lines: Array<{ id: string; name: string; quantity: number; unitPriceMinor: number; lineTotalMinor: number }>
}

/**
 * One invoice, scoped to the business that issued it.
 *
 * The number in the URL is per business and therefore guessable, which is fine
 * and by design: the `business_id` filter is what makes it safe, not the number
 * being secret. Numbers must stay human quotable ("invoice 41"), so they cannot
 * be random.
 */
export async function getInvoice(businessId: string, number: number): Promise<InvoiceDocument | null> {
  const invoiceResult = await db
    .from('invoices')
    .select('number, issued_at, total_minor, currency, order_id')
    .eq('business_id', businessId)
    .eq('number', number)
    .maybeSingle()
  throwIfDbError('load invoice', invoiceResult.error)
  const invoice = invoiceResult.data
  if (!invoice) return null

  const businessResult = await db
    .from('businesses')
    .select('name, slug, address, phone')
    .eq('id', businessId)
    .single()
  throwIfDbError('load invoice business', businessResult.error)

  let lines: InvoiceDocument['lines'] = []
  let customerName: string | null = null

  if (invoice.order_id) {
    const [itemsResult, orderResult] = await Promise.all([
      db
        .from('order_items')
        .select('id, name, quantity, unit_price_minor, line_total_minor')
        .eq('order_id', invoice.order_id),
      // Two reads rather than a PostgREST embed: the generated types do not
      // know this relationship yet (see database.pending.ts), and a join whose
      // shape the compiler cannot check is a runtime surprise waiting.
      db.from('orders').select('customer_id').eq('id', invoice.order_id).maybeSingle(),
    ])
    throwIfDbError('load invoice lines', itemsResult.error)
    throwIfDbError('load invoice customer', orderResult.error)
    lines = (itemsResult.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPriceMinor: item.unit_price_minor,
      lineTotalMinor: item.line_total_minor,
    }))
    if (orderResult.data?.customer_id) {
      const customerResult = await db
        .from('customers')
        .select('display_name')
        .eq('id', orderResult.data.customer_id)
        .eq('business_id', businessId)
        .maybeSingle()
      throwIfDbError('load invoice customer name', customerResult.error)
      customerName = customerResult.data?.display_name ?? null
    }
  }

  return {
    number: invoice.number,
    issuedAt: invoice.issued_at,
    totalMinor: invoice.total_minor,
    currency: invoice.currency,
    businessName: businessResult.data!.name,
    businessSlug: businessResult.data!.slug,
    businessAddress: businessResult.data!.address,
    businessPhone: businessResult.data!.phone,
    customerName,
    lines,
  }
}
