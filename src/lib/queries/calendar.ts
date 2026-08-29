import 'server-only'
import { db } from '../db.ts'
import { throwIfDbError } from '../db-result.ts'
import { cambodiaDayBounds } from '../time/cambodia.ts'
import type { CurrencyCode } from '../types.ts'

/**
 * A day of bookings, arranged by resource, which is the model this product
 * actually has. ARCHITECTURE.md rejects Cal.com precisely here: Cal.com does one
 * person's calendar, and a salon is three chairs, a guesthouse is twelve rooms.
 * Lanes are the shape of the business, not a display preference.
 */
export type LaneBooking = {
  id: string
  code: string
  status: string
  startsAt: string
  endsAt: string
  customer: string
  service: string
  resourceId: string | null
  channel: string
  priceMinor: number
  paidMinor: number
  currency: CurrencyCode
}

export type CalendarDay = {
  date: string
  start: string
  end: string
  resources: Array<{ id: string; name: string; kind: string }>
  bookings: LaneBooking[]
}

export async function getCalendarDay(businessId: string, day = new Date()): Promise<CalendarDay> {
  const bounds = cambodiaDayBounds(day)

  const [resourcesResult, bookingsResult] = await Promise.all([
    db
      .from('resources')
      .select('id, name, kind')
      .eq('business_id', businessId)
      .eq('active', true)
      .order('name'),
    // The view carries the joined names and the derived balance, so a lane can
    // show the expected amount without a second query per booking.
    db
      .from('bookings')
      .select('id, code, status, starts_at, ends_at, resource_id, channel, price_minor, currency, customers(display_name), services(name)')
      .eq('business_id', businessId)
      .gte('starts_at', bounds.start)
      .lt('starts_at', bounds.end)
      .order('starts_at'),
  ])
  throwIfDbError('load calendar resources', resourcesResult.error)
  throwIfDbError('load calendar bookings', bookingsResult.error)

  const bookings = bookingsResult.data ?? []
  const paid = new Map<string, number>()
  if (bookings.length > 0) {
    const paymentsResult = await db
      .from('payments')
      .select('booking_id, amount_minor')
      .eq('business_id', businessId)
      .eq('status', 'paid')
      .in('booking_id', bookings.map((booking) => booking.id))
    throwIfDbError('load calendar payments', paymentsResult.error)
    for (const payment of paymentsResult.data ?? []) {
      if (!payment.booking_id) continue
      paid.set(payment.booking_id, (paid.get(payment.booking_id) ?? 0) + payment.amount_minor)
    }
  }

  return {
    date: bounds.start.slice(0, 10),
    start: bounds.start,
    end: bounds.end,
    resources: resourcesResult.data ?? [],
    bookings: bookings.map((booking) => ({
      id: booking.id,
      code: booking.code,
      status: booking.status,
      startsAt: booking.starts_at,
      endsAt: booking.ends_at,
      customer: booking.customers?.display_name ?? 'អតិថិជន',
      service: booking.services?.name ?? '',
      resourceId: booking.resource_id,
      channel: booking.channel,
      priceMinor: booking.price_minor,
      paidMinor: paid.get(booking.id) ?? 0,
      currency: booking.currency as CurrencyCode,
    })),
  }
}
