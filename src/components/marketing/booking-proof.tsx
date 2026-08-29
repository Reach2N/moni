import { KhqrMark, Receipt, ReceiptLine, Sheet, SheetHead } from '@/components/marketing/artifacts.tsx'
import { IconCheck, IconHandBack, IconMessage, IconQr } from '@/components/marketing/icons.tsx'
import { moneyKm } from '@/lib/format/khmer.ts'
import type { Copy, Locale } from '@/lib/marketing/copy.ts'
import { SERVICE_TEMPLATES, formatMoney } from '@/lib/types.ts'

/**
 * The trust loop, shown as the shop's own record: the transcript on one side,
 * the receipt it produced on the other.
 *
 * This used to be two dark cards of chat bubbles with hardcoded #30D158 and
 * #111113, which meant it only worked on a permanently dark band and read as
 * generic messenger UI. A shop owner already knows what a chat looks like; what
 * they need to see is that the conversation ends in a written record with the
 * right amount on it.
 */
export function BookingProof({ copy, locale }: { copy: Copy; locale: Locale }) {
  const c = copy.proof
  const first = SERVICE_TEMPLATES.salon?.[0]
  const amount = first
    ? locale === 'km'
      ? moneyKm(first.price_minor, 'KHR')
      : formatMoney(first.price_minor, 'KHR')
    : ''

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-10">
      <Sheet>
        <SheetHead
          title={c.customerLabel}
          note={`${copy.channels.now} · ${copy.demo.example}`}
          mark={<IconMessage className="size-4" />}
        />
        <dl className="divide-y divide-label/10">
          <div className="px-4 py-4 sm:px-5">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label-3">
              {c.customerLabel}
            </dt>
            <dd className="mt-1.5 text-[15px] text-pretty text-label">{c.customerMessage}</dd>
          </div>
          <div className="border-l-2 border-green px-4 py-4 sm:px-5">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label-3">
              {c.assistantLabel}
            </dt>
            <dd className="mt-1.5 text-[15px] text-pretty text-label">{c.assistantMessage}</dd>
          </div>
        </dl>
        <div className="flex items-start gap-2.5 border-t border-label/15 px-4 py-4 sm:px-5">
          <IconHandBack className="mt-0.5 size-4 shrink-0 text-label-2" />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-label">{c.handoff}</p>
            <p className="mt-1 text-sm text-pretty text-label-2">{c.handoffBody}</p>
          </div>
        </div>
      </Sheet>

      <Receipt
        head={
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-label-3">{c.bookingLabel}</p>
            <p className="mt-2 text-xl font-semibold text-balance text-label">{c.bookingValue}</p>
            <p className="mt-1 text-sm text-label-2">{c.ownerNote}</p>
          </>
        }
        stamp={
          <>
            <IconCheck className="size-4 shrink-0 text-green" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">
              {c.bookingStatus}
            </span>
          </>
        }
      >
        <div className="space-y-2.5 text-[15px]">
          <ReceiptLine label={locale === 'km' ? (first?.name ?? '') : (first?.name_en ?? '')} value={amount} />
          <ReceiptLine label={c.bookingLabel} value={c.bookingStatus} />
        </div>
        <div className="mt-5 border-t border-label/15 pt-4">
          <KhqrMark label="KHQR" amount={amount} />
          <p className="mt-3 flex items-start gap-2 text-xs text-label-3">
            <IconQr className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0">{copy.pricing.headline}</span>
          </p>
        </div>
      </Receipt>
    </div>
  )
}
