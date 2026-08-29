import 'server-only'
import { db } from '../db.ts'
import { throwIfDbError } from '../db-result.ts'
import { cambodiaDayBounds, cambodiaDayOfWeek, cambodiaMonthBounds, parseClock } from '../time/cambodia.ts'
import type { BookingStatus, CurrencyCode, OpeningHours } from '../types.ts'
import { getBusinessById } from './business.ts'

export type DashboardSnapshot = {
  business: {
    id: string
    slug: string
    name: string
    businessType: string
    category: string
    phone: string | null
    address: string | null
    province: string | null
    timezone: string
    currency: CurrencyCode
    locale: string
    hours: OpeningHours
    plan: string
    quota: number
  }
  services: Array<{
    id: string
    name: string
    nameEn: string | null
    description: string | null
    priceMinor: number
    currency: CurrencyCode
    unit: string
    durationMin: number
    bufferMin: number
    capacity: number
    requiresDeposit: boolean
    depositMinor: number | null
    sortOrder: number
  }>
  resources: Array<{ id: string; name: string; kind: string }>
  /** Every channel the shop has ever wired up, connected or not. */
  channels: Array<{ channel: string; displayName: string | null; status: string; lastError: string | null }>
  /** Closures that have not finished yet, soonest first. Bounded to the next 30 days. */
  closures: Array<{ id: string; startsAt: string; endsAt: string; reason: string | null }>
  /** Read time, so anything derived from the snapshot stays a pure function of it. */
  nowIso: string
  today: {
    date: string
    start: string
    end: string
    bookings: Array<{
      id: string
      code: string
      status: BookingStatus
      startsAt: string
      endsAt: string
      customer: string
      customerPhone: string | null
      service: string
      serviceEn: string | null
      resource: string
      channel: string
      priceMinor: number
      paidMinor: number
      balanceMinor: number
      currency: CurrencyCode
    }>
    collectedMinor: number
    collectedByCurrency: Record<string, number>
    /** Booked but not yet collected, per currency. A shop can quote riel and dollars. */
    owedByCurrency: Record<string, number>
    openMinutes: { open: number; close: number } | null
    waitingCount: number
  }
  needsOwner: Array<{
    id: string
    channel: string
    customer: string
    reason: string
    lastMessageAt: string
  }>
  usage: {
    month: string
    plan: string
    limit: number
    used: number
    left: number
    conversations: number
  }
}

/**
 * One serializable snapshot for one shop. The business row is the only
 * dependency; every remaining read starts together after it lands.
 *
 * `businessId` comes from `requireMember()` and from nowhere else. Every query
 * below is scoped by it, which is the entirety of tenant isolation here
 * (ARCHITECTURE.md section 2): there are no RLS policies to fall back on.
 */
export async function getDashboardSnapshot(businessId: string, now = new Date()): Promise<DashboardSnapshot> {
  const business = await getBusinessById(businessId)
  const day = cambodiaDayBounds(now)
  const month = cambodiaMonthBounds(now)
  const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const [servicesResult, resourcesResult, bookingsResult, paymentsResult, escalationsResult, monthBookingsResult, monthPaymentsResult, monthConversationsResult, channelsResult, closuresResult] =
    await Promise.all([
      db
        .from('services')
        .select(
          'id, name, name_en, description, price_minor, currency, unit, duration_min, buffer_min, capacity, requires_deposit, deposit_minor, sort_order',
        )
        .eq('business_id', business.id)
        .eq('active', true)
        .order('sort_order')
        .order('name'),
      db
        .from('resources')
        .select('id, name, kind')
        .eq('business_id', business.id)
        .eq('active', true)
        .order('name'),
      db
        .from('v_bookings_agent')
        .select(
          'id, code, status, starts_at, ends_at, customer_name, customer_phone, service_name, service_name_en, resource_name, channel, price_minor, paid_minor, balance_minor, currency',
        )
        .eq('business_id', business.id)
        .gte('starts_at', day.start)
        .lt('starts_at', day.end)
        .order('starts_at'),
      db
        .from('payments')
        .select('amount_minor, currency')
        .eq('business_id', business.id)
        .eq('status', 'paid')
        .gte('paid_at', day.start)
        .lt('paid_at', day.end),
      db
        .from('conversations')
        .select('id, channel, needs_owner_reason, last_message_at, customers(display_name)')
        .eq('business_id', business.id)
        .eq('status', 'needs_owner')
        .order('last_message_at', { ascending: false }),
      db
        .from('bookings')
        .select('id')
        .eq('business_id', business.id)
        .in('status', ['confirmed', 'completed'])
        .gte('created_at', month.start)
        .lt('created_at', month.end),
      db
        .from('payments')
        .select('id')
        .eq('business_id', business.id)
        .eq('status', 'paid')
        .is('booking_id', null)
        .gte('paid_at', month.start)
        .lt('paid_at', month.end),
      db
        .from('conversations')
        .select('customer_id')
        .eq('business_id', business.id)
        .gte('last_message_at', month.start)
        .lt('last_message_at', month.end),
      db
        .from('channel_connections')
        .select('channel, display_name, status, last_error')
        .eq('business_id', business.id)
        .order('channel'),
      db
        .from('closures')
        .select('id, starts_at, ends_at, reason')
        .eq('business_id', business.id)
        .gte('ends_at', now.toISOString())
        .lt('starts_at', horizon)
        .order('starts_at'),
    ])

  throwIfDbError('load active services', servicesResult.error)
  throwIfDbError('load active resources', resourcesResult.error)
  throwIfDbError('load today bookings', bookingsResult.error)
  throwIfDbError('load today payments', paymentsResult.error)
  throwIfDbError('load owner escalations', escalationsResult.error)
  throwIfDbError('load monthly bookings', monthBookingsResult.error)
  throwIfDbError('load monthly standalone payments', monthPaymentsResult.error)
  throwIfDbError('load monthly conversations', monthConversationsResult.error)
  throwIfDbError('load channel connections', channelsResult.error)
  throwIfDbError('load upcoming closures', closuresResult.error)

  const collectedByCurrency: Record<string, number> = {}
  for (const payment of paymentsResult.data ?? []) {
    collectedByCurrency[payment.currency] = (collectedByCurrency[payment.currency] ?? 0) + payment.amount_minor
  }

  const bookings = (bookingsResult.data ?? []).flatMap((booking) => {
    if (!booking.id || !booking.code || !booking.starts_at || !booking.ends_at) return []
    return [{
      id: booking.id,
      code: booking.code,
      status: booking.status as BookingStatus,
      startsAt: booking.starts_at,
      endsAt: booking.ends_at,
      customer: booking.customer_name ?? 'Unknown customer',
      customerPhone: booking.customer_phone,
      service: booking.service_name ?? 'Unknown service',
      serviceEn: booking.service_name_en,
      resource: booking.resource_name ?? 'Unassigned',
      channel: booking.channel ?? 'web',
      priceMinor: booking.price_minor ?? 0,
      paidMinor: booking.paid_minor ?? 0,
      balanceMinor: booking.balance_minor ?? 0,
      currency: (booking.currency ?? business.default_currency) as CurrencyCode,
    }]
  })

  const used = (monthBookingsResult.data?.length ?? 0) + (monthPaymentsResult.data?.length ?? 0)
  const customerIds = new Set((monthConversationsResult.data ?? []).map((row) => row.customer_id))

  // Money the shop has earned today and not yet been handed. A cancelled or no-show
  // booking is not a debt, so neither is counted.
  const owedByCurrency: Record<string, number> = {}
  for (const booking of bookings) {
    if (booking.balanceMinor <= 0) continue
    if (booking.status === 'cancelled' || booking.status === 'no_show') continue
    owedByCurrency[booking.currency] = (owedByCurrency[booking.currency] ?? 0) + booking.balanceMinor
  }

  const hours = business.hours as unknown as OpeningHours
  const todayHours = hours.find((entry) => entry.dow === cambodiaDayOfWeek(day.date))

  return {
    business: {
      id: business.id,
      slug: business.slug,
      name: business.name,
      businessType: business.business_type,
      category: business.category,
      phone: business.phone,
      address: business.address,
      province: business.province,
      timezone: business.timezone,
      currency: business.default_currency as CurrencyCode,
      locale: business.locale,
      hours,
      plan: business.plan,
      quota: business.quota_txn_month,
    },
    services: (servicesResult.data ?? []).map((service) => ({
      id: service.id,
      name: service.name,
      nameEn: service.name_en,
      description: service.description,
      priceMinor: service.price_minor,
      currency: service.currency as CurrencyCode,
      unit: service.unit,
      durationMin: service.duration_min,
      bufferMin: service.buffer_min,
      capacity: service.capacity,
      requiresDeposit: service.requires_deposit,
      depositMinor: service.deposit_minor,
      sortOrder: service.sort_order,
    })),
    resources: resourcesResult.data ?? [],
    channels: (channelsResult.data ?? []).map((row) => ({
      channel: row.channel,
      displayName: row.display_name,
      status: row.status,
      lastError: row.last_error,
    })),
    closures: (closuresResult.data ?? []).map((closure) => ({
      id: closure.id,
      startsAt: closure.starts_at,
      endsAt: closure.ends_at,
      reason: closure.reason,
    })),
    nowIso: now.toISOString(),
    today: {
      date: day.date,
      start: day.start,
      end: day.end,
      bookings,
      collectedMinor: collectedByCurrency[business.default_currency] ?? 0,
      collectedByCurrency,
      owedByCurrency,
      openMinutes: todayHours ? { open: parseClock(todayHours.open), close: parseClock(todayHours.close) } : null,
      waitingCount: bookings.filter((booking) => booking.status === 'pending' || booking.status === 'confirmed').length,
    },
    needsOwner: (escalationsResult.data ?? []).map((conversation) => ({
      id: conversation.id,
      channel: conversation.channel,
      customer: conversation.customers?.display_name ?? 'Unknown customer',
      reason: conversation.needs_owner_reason ?? 'Owner review requested',
      lastMessageAt: conversation.last_message_at,
    })),
    usage: {
      month: month.month,
      plan: business.plan,
      limit: business.quota_txn_month,
      used,
      left: Math.max(business.quota_txn_month - used, 0),
      conversations: customerIds.size,
    },
  }
}
