/**
 * The shop's own paper.
 *
 * The landing page's illustrations are the objects a Cambodian shop already
 * has: the price list taped to the wall, the receipt handed across the counter,
 * the KHQR sticker by the till. Nothing here is a floating browser window with
 * traffic lights, a gradient mesh, or a glowing card. Those belong to software
 * marketing; these belong to the shop, which is whose side Moni is on.
 *
 * All three share one substrate: white ground, a single hairline, square
 * corners on the paper itself and ruled horizontal separators. Riel amounts and
 * Khmer numerals do the decorating, so no ornament has to be invented.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** The paper. Everything else is printed on this. */
export function Sheet({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'figure' | 'aside'
}) {
  return (
    <Tag className={cn('border border-label/15 bg-surface text-label shadow-[0_1px_0_var(--separator)]', className)}>
      {children}
    </Tag>
  )
}

/** The ruled heading band every sheet carries, like a printed form's title. */
export function SheetHead({
  title,
  note,
  mark,
}: {
  title: string
  note?: string
  mark?: ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-label/15 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        {mark ? <span className="shrink-0 text-label-2">{mark}</span> : null}
        <h3 className="truncate text-[13px] font-semibold uppercase tracking-[0.14em] text-label">{title}</h3>
      </div>
      {note ? <p className="shrink-0 text-[11px] uppercase tracking-[0.1em] text-label-3">{note}</p> : null}
    </div>
  )
}

export type PriceRow = { name: string; price: string; meta?: string }

/** The price list taped to the wall. Amounts right-aligned, tabular, in riel. */
export function PriceList({
  title,
  note,
  rows,
  footer,
  mark,
  className,
}: {
  title: string
  note?: string
  rows: readonly PriceRow[]
  footer?: ReactNode
  mark?: ReactNode
  className?: string
}) {
  return (
    <Sheet as="figure" className={className}>
      <SheetHead title={title} note={note} mark={mark} />
      <dl className="divide-y divide-label/10">
        {rows.map((row) => (
          <div key={row.name} className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 px-4 py-3 sm:px-5">
            <dt className="min-w-0 truncate text-[15px] text-label">{row.name}</dt>
            <dd className="tnum text-[15px] font-semibold text-label">{row.price}</dd>
            {row.meta ? (
              <p className="tnum col-span-2 mt-0.5 text-xs text-label-3">{row.meta}</p>
            ) : null}
          </div>
        ))}
      </dl>
      {footer ? (
        <div className="border-t border-label/15 px-4 py-3 text-[13px] text-label-2 sm:px-5">{footer}</div>
      ) : null}
    </Sheet>
  )
}

/**
 * The receipt handed across the counter.
 *
 * The tear is a perforation line with a notch punched out of each edge, not a
 * zigzag clip-path. A zigzag needs the page ground painted into the notches to
 * read at all, which breaks the moment the sheet sits on a tinted band or the
 * scheme flips. A notch is two circles filled with the CURRENT ground, so it
 * follows whatever the receipt is lying on.
 */
export function Receipt({
  head,
  children,
  stamp,
  className,
}: {
  head: ReactNode
  children: ReactNode
  stamp?: ReactNode
  className?: string
}) {
  return (
    <Sheet className={cn('relative', className)}>
      <div className="px-4 pb-5 pt-4 sm:px-5">{head}</div>

      <div className="relative" aria-hidden>
        <div className="border-t border-dashed border-label/25" />
        <span className="absolute -left-[7px] -top-[7px] size-3.5 rounded-full border border-label/15 bg-surface" />
        <span className="absolute -right-[7px] -top-[7px] size-3.5 rounded-full border border-label/15 bg-surface" />
      </div>

      <div className="px-4 pb-4 pt-5 sm:px-5">{children}</div>

      {stamp ? (
        <div className="flex items-center gap-2 border-t border-label/15 px-4 py-3 sm:px-5">{stamp}</div>
      ) : null}
    </Sheet>
  )
}

/**
 * A line on a receipt: label left, amount right, dot leaders between.
 * The leaders are a repeating radial gradient, so they reflow with the text
 * instead of being a fixed run of full stops that wraps badly in Khmer.
 */
export function ReceiptLine({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <p className={cn('flex items-baseline gap-2', strong ? 'text-label' : 'text-label-2')}>
      <span className={cn('min-w-0 shrink truncate', strong && 'font-semibold')}>{label}</span>
      <span
        className="h-px min-w-6 flex-1 translate-y-[-3px] bg-[radial-gradient(circle,var(--separator)_1px,transparent_1px)] bg-[length:5px_1px] bg-repeat-x"
        aria-hidden
      />
      <span className={cn('tnum shrink-0', strong ? 'font-semibold' : 'font-medium text-label')}>{value}</span>
    </p>
  )
}

/**
 * The KHQR sticker by the till.
 *
 * The module grid is a fixed decorative pattern, NOT an encoded payload: a
 * marketing page that prints something scannable is printing a payment
 * instruction, and this one is a picture of the rail, not the rail. It carries
 * the three finder squares so it reads instantly as a QR and nothing else.
 */
const MODULES = [
  '1111111011011111111',
  '1000001000101000001',
  '1011101011101011101',
  '1011101000101011101',
  '1011101101101011101',
  '1000001010001000001',
  '1111111010101111111',
  '0000000011000000000',
  '1101101001011010110',
  '0010110110100101101',
  '1100011010110110010',
  '0000000101101001011',
  '1111111010011011010',
  '1000001001101001101',
  '1011101110010110011',
  '1011101011011010101',
  '1011101100101101100',
  '1000001010110010110',
  '1111111011001011011',
]

export function KhqrMark({ label, amount }: { label: string; amount?: string }) {
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 19 19" className="size-16 shrink-0" aria-hidden shapeRendering="crispEdges">
        {MODULES.map((row, y) =>
          row.split('').map((cell, x) =>
            cell === '1' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null,
          ),
        )}
      </svg>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label-2">{label}</p>
        {amount ? <p className="tnum mt-1 text-lg font-semibold text-label">{amount}</p> : null}
      </div>
    </div>
  )
}
