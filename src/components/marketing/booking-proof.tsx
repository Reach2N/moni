import { CalendarCheck2, Check, MessageCircle, ShieldCheck } from 'lucide-react'
import type { Copy } from '@/lib/marketing/copy'
import { BlurFade } from '@/components/velora/blur-fade'

// Hand-built after checking the shadcn blocks and the verified 21st.dev list.
// Those blocks model a generic dashboard; this small preview needs to show the
// trust loop between a customer message and the owner's calendar instead.
export function BookingProof({ copy }: { copy: Copy }) {
  const c = copy.proof

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <BlurFade direction="left" className="h-full" delay={0.05}>
        <div className="h-full rounded-[24px] border border-white/15 bg-white/[0.06] p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-[#30D158] text-[#111113]">
            <MessageCircle className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">{c.customerLabel}</p>
            <p className="text-xs text-white/60">Telegram · example conversation</p>
          </div>
        </div>

        <div className="mt-8 space-y-4" aria-label={`${c.customerLabel} and ${c.assistantLabel} example conversation`}>
          <div className="max-w-[90%] rounded-2xl rounded-tl-md bg-white/[0.12] px-4 py-3 text-[15px] text-white/90">
            {c.customerMessage}
          </div>
          <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-md bg-[#30D158] px-4 py-3 text-[15px] text-[#111113]">
            <p className="mb-1 text-xs font-semibold text-[#111113]/70">{c.assistantLabel}</p>
            {c.assistantMessage}
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2 text-xs text-white/60">
          <ShieldCheck className="size-4 text-[#30D158]" aria-hidden />
          <span>{c.handoffBody}</span>
        </div>
        </div>
      </BlurFade>

      <BlurFade direction="right" className="h-full" delay={0.12}>
        <div className="h-full rounded-[24px] border border-white/15 bg-white/[0.06] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-white text-[#111113]">
              <CalendarCheck2 className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{c.bookingLabel}</p>
              <p className="text-xs text-white/60">{c.ownerNote}</p>
            </div>
          </div>
          <span className="rounded-full bg-[#30D158] px-2.5 py-1 text-xs font-semibold text-[#111113]">{c.bookingStatus}</span>
        </div>

        <div className="mt-8 rounded-2xl border border-white/15 bg-[#0a0a0b] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-white/60">{c.bookingLabel}</p>
              <p className="mt-1 text-base font-semibold text-white">{c.bookingValue}</p>
            </div>
            <Check className="size-5 shrink-0 text-[#30D158]" aria-hidden />
          </div>
          <div className="mt-4 h-px bg-white/10" />
          <div className="mt-3 flex items-center justify-between text-xs text-white/60">
            <span>{c.ownerNote}</span>
            <span className="tnum">10:00</span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[#30D158]/40 bg-[#30D158]/10 p-4">
          <p className="text-sm font-semibold text-white">{c.handoff}</p>
          <p className="mt-1 text-sm text-white/65">{c.handoffBody}</p>
        </div>
        </div>
      </BlurFade>
    </div>
  )
}
