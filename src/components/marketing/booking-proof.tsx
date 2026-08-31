import { KhqrMark, ReceiptLine, Sheet } from '@/components/marketing/artifacts.tsx'
import { IconCheck, IconMessage, IconShield } from '@/components/marketing/icons.tsx'
import { moneyKm } from '@/lib/format/khmer.ts'
import type { Copy, Locale } from '@/lib/marketing/copy.ts'
import { SERVICE_TEMPLATES, formatMoney } from '@/lib/types.ts'

/**
 * The guardrail and the record it produced, held in one connected surface.
 *
 * This used to open with the transcript, which AgentConversation now shows in
 * the hero. Repeating it here would have made the page argue the same point
 * twice, so this section takes the two things the conversation does not say:
 * what Moni does when it is NOT sure, and what the shop is left holding
 * afterwards.
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
    <Sheet className="overflow-hidden">
      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
        <div className="p-5 sm:p-7">
          <span className="flex size-10 items-center justify-center rounded-[10px] bg-green/12 text-green">
            <IconShield className="size-5" />
          </span>
          <h3 className="mt-4 text-xl font-semibold tracking-tight text-balance text-label">{c.handoff}</h3>
          <p className="mt-2 text-[15px] text-pretty text-label-2">{c.handoffBody}</p>

          <dl className="mt-6 divide-y divide-separator border-t border-separator">
            <div className="flex items-start gap-3 py-3">
              <IconMessage className="mt-0.5 size-4 shrink-0 text-label-3" />
              <div className="min-w-0">
                <dt className="text-[13px] font-semibold text-label">{c.assistantLabel}</dt>
                <dd className="text-sm text-pretty text-label-2">{copy.agent.replyNote}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3 py-3">
              <IconCheck className="mt-0.5 size-4 shrink-0 text-green" />
              <div className="min-w-0">
                <dt className="text-[13px] font-semibold text-label">{c.ownerNote}</dt>
                <dd className="text-sm text-pretty text-label-2">{c.bookingValue}</dd>
              </div>
            </div>
          </dl>
        </div>

        <div className="border-t border-separator p-5 lg:border-l lg:border-t-0 sm:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-label-3">{c.bookingLabel}</p>
          <p className="mt-2 text-xl font-semibold text-balance text-label">{c.bookingValue}</p>
          <p className="mt-1 text-sm text-label-2">{c.ownerNote}</p>

          <div className="mt-6 space-y-2.5 border-t border-separator pt-5 text-[15px]">
            <ReceiptLine label={locale === 'km' ? (first?.name ?? '') : (first?.name_en ?? '')} value={amount} />
            <ReceiptLine label={c.bookingLabel} value={c.bookingStatus} />
          </div>
          <div className="mt-5 border-t border-separator pt-4">
            {/* The pricing section's headline used to be captioned under this
                mark. It is pricing copy, it was the page's second printing of
                the same sentence, and on a booking receipt it read as a claim
                about the customer's payment rather than about Moni's plan. The
                mark carries its own label and amount. */}
            <KhqrMark label="KHQR" amount={amount} />
          </div>
          <div className="mt-5 flex items-center gap-2 border-t border-separator pt-4">
            <IconCheck className="size-4 shrink-0 text-green" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label">
              {c.bookingStatus}
            </span>
          </div>
        </div>
      </div>
    </Sheet>
  )
}
