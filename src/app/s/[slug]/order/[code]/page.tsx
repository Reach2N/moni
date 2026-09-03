import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { BadgeCheck, Clock, PackageCheck, XCircle } from 'lucide-react'
import { formatMoney, type OrderStatus } from '@/lib/types.ts'
import { toKhmerDigits } from '@/lib/format/khmer.ts'

export const dynamic = 'force-dynamic'

/**
 * One order, on the shop's own site, at an address the customer can come back to.
 *
 * Reloadable and shareable, which an inline result on the menu page is not: a
 * customer who closes the tab halfway through paying has to be able to get back
 * to the QR, and the owner confirming from her banking app happens minutes
 * later on a page nobody is holding open. `force-dynamic` because the status is
 * the whole point of a reload.
 *
 * It renders inside the shop's OWN seeded style, the same `.sf` block and the
 * same `styleFor()` vars as the menu, so it reads as part of her site rather
 * than a Moni checkout page bolted onto the end of it.
 *
 * A code belonging to another shop is a 404, checked against the business this
 * slug resolves to and never against the code alone: six characters out of two
 * generators can collide, and a customer must never be shown another shop's
 * order because two codes happened to match.
 */
export const metadata: Metadata = {
  title: 'ការបញ្ជាទិញ',
  // An order page is one customer's business and nobody else's. It carries a
  // name, a phone and what she bought.
  robots: { index: false, follow: false },
}

const STATUS_KM: Record<OrderStatus, { label: string; note: string }> = {
  pending: { label: 'រង់ចាំការទូទាត់', note: 'សូមស្កេន QR ខាងក្រោមដើម្បីបង់ប្រាក់។' },
  confirmed: { label: 'បានទទួលប្រាក់ហើយ', note: 'ហាងបានបញ្ជាក់ថាទទួលប្រាក់រួចហើយ។ អរគុណ។' },
  fulfilled: { label: 'បានប្រគល់រួច', note: 'ការបញ្ជាទិញនេះបានបញ្ចប់ហើយ។' },
  cancelled: { label: 'បានលុបចោល', note: 'ការបញ្ជាទិញនេះត្រូវបានលុបចោល។ សូមបញ្ជាទិញឡើងវិញ។' },
}

const STATUS_ICON = {
  pending: Clock,
  confirmed: BadgeCheck,
  fulfilled: PackageCheck,
  cancelled: XCircle,
} as const

export default async function OrderPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>
}) {
  const { slug, code } = await params
  if (!/^[A-Z0-9]{4,12}$/i.test(code)) notFound()

  const { getStorefront } = await import('@/lib/queries/storefront.ts')
  const { getPublicOrder } = await import('@/lib/queries/order.ts')
  const storefront = await getStorefront(slug)
  // An unpublished shop has no site, so it has no order pages either. Same
  // lookup as the menu, so the two can never disagree about what exists.
  if (!storefront) notFound()

  const order = await getPublicOrder(storefront.businessId, code)
  if (!order) notFound()

  const status = STATUS_KM[order.status]
  const Icon = STATUS_ICON[order.status]
  const showQr =
    order.status === 'pending' && !!order.payment?.hasQr && !order.payment.expired
  const payAtShop = order.status === 'pending' && !order.payment?.hasQr

  return (
    <div
      className="sf min-h-dvh bg-surface text-label"
      style={storefront.style.vars as CSSProperties}
      data-rule={storefront.style.rule}
    >
      <div className="mx-auto w-full max-w-md px-5 py-10">
        <p className="km text-sm text-label-2">{storefront.data.shop.name}</p>
        <h1 className="km mt-1 text-[length:var(--sf-text-2)] font-semibold">ការបញ្ជាទិញ</h1>
        <p className="mt-1 text-sm text-label-2">
          {/* The code is Latin and stays Latin: she reads it back to the shop over
              a phone, and a transliterated code is not the code. */}
          <span className="font-mono tracking-wide">{order.code}</span>
        </p>

        <div className="km mt-6 flex items-start gap-2 rounded-[var(--sf-radius)] bg-accent-tint p-4">
          <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
          <span>
            <span className="block font-semibold">{status.label}</span>
            <span className="mt-1 block text-sm text-label-2">{status.note}</span>
          </span>
        </div>

        <ul className="sf-section mt-8">
          {order.lines.map((line, index) => (
            <li key={`${line.name}-${index}`} className="sf-row flex items-baseline gap-3">
              <span className="km min-w-0 flex-1">
                <span className="block">{line.name}</span>
                <span className="block text-xs text-label-2">
                  {/* Quantities are transliterated, never formatted through a
                      km-KH locale: Node and Chrome disagree on that locale's
                      separators, which is a hydration mismatch on every number. */}
                  {toKhmerDigits(line.quantity)} × {formatMoney(line.unitPriceMinor, order.currency)}
                </span>
              </span>
              <span className="tnum shrink-0">{formatMoney(line.lineTotalMinor, order.currency)}</span>
            </li>
          ))}
        </ul>

        <p className="km mt-4 flex items-baseline justify-between border-t border-separator pt-4 text-lg font-semibold">
          <span>សរុប</span>
          <span className="tnum">{formatMoney(order.totalMinor, order.currency)}</span>
        </p>

        {order.note ? <p className="km mt-4 text-sm text-label-2">{order.note}</p> : null}

        {showQr ? (
          <figure className="mt-8">
            {/* eslint-disable-next-line @next/next/no-img-element -- a no-store SVG built per request, which the image pipeline would only cache wrongly */}
            <img
              src={`/api/pay/order/${order.code}?v=${order.payment?.expiresAt ?? ''}`}
              alt={`KHQR ${formatMoney(order.totalMinor, order.currency)}`}
              className="mx-auto w-full max-w-xs"
            />
            <figcaption className="km mt-3 text-center text-sm text-label-2">
              ស្កេនដោយកម្មវិធីធនាគាររបស់អ្នក។ ប្រាក់ចូលគណនីហាងផ្ទាល់។
            </figcaption>
          </figure>
        ) : null}

        {order.status === 'pending' && order.payment?.expired ? (
          <p className="km mt-8 rounded-[var(--sf-radius)] border border-separator p-4 text-sm">
            លេខកូដ QR នេះផុតកំណត់ហើយ។ សូមទាក់ទងហាងដើម្បីបង់ប្រាក់។
          </p>
        ) : null}

        {payAtShop ? (
          <p className="km mt-8 rounded-[var(--sf-radius)] border border-separator p-4 text-sm">
            ហាងនេះមិនទាន់ទទួលការទូទាត់តាម QR ទេ។ សូមបង់ប្រាក់នៅហាងដោយផ្ទាល់
            ហើយប្រាប់លេខកូដ <span className="font-mono">{order.code}</span>។
          </p>
        ) : null}

        <p className="km mt-8 text-xs text-label-2">
          {storefront.data.shop.address ? `${storefront.data.shop.address} · ` : ''}
          {storefront.data.shop.phone ?? ''}
        </p>
      </div>
    </div>
  )
}
