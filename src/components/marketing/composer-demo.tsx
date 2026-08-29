'use client'

// Hand-built after checking shadcn/ui and the available 21st.dev registry.
// Neither has a small, accessible parse-preview primitive that fits Moni's
// tokens. This component is deliberately a local, deterministic presentation
// of the product moment. It never calls the model or sends visitor data.

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Check, Mic, RotateCcw, Sparkles } from 'lucide-react'
import { SERVICE_TEMPLATES, formatMoney } from '@/lib/types'
import { moneyKm, durationKm, toKhmerDigits } from '@/lib/format/khmer'
import type { Copy, Locale } from '@/lib/marketing/copy'
import { BrowserMockup } from '@/components/velora/browser-mockup'

const ROWS = (SERVICE_TEMPLATES.salon ?? []).slice(0, 3)

function splitGraphemes(value: string): string[] {
  if (typeof Intl.Segmenter === 'function') {
    return Array.from(new Intl.Segmenter('km', { granularity: 'grapheme' }).segment(value), (part) => part.segment)
  }
  return Array.from(value)
}

export function ComposerDemo({ copy, locale }: { copy: Copy; locale: Locale }) {
  const full = copy.demo.typed
  const [typed, setTyped] = useState(full)
  const [replaying, setReplaying] = useState(false)
  const [replayKey, setReplayKey] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const stopTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = undefined
  }, [])

  const replay = useCallback(() => {
    stopTimer()
    setReplayKey((key) => key + 1)
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(full)
      setReplaying(false)
      return
    }

    const clusters = splitGraphemes(full)
    let index = 0
    setTyped('')
    setReplaying(true)

    const tick = () => {
      index += 1
      setTyped(clusters.slice(0, index).join(''))
      if (index < clusters.length) {
        timer.current = setTimeout(tick, 42)
      } else {
        timer.current = setTimeout(() => {
          setTyped(full)
          setReplaying(false)
          timer.current = undefined
        }, 260)
      }
    }
    tick()
  }, [full, stopTimer])

  useEffect(() => stopTimer, [stopTimer])

  const price = (minor: number) => (locale === 'km' ? moneyKm(minor, 'KHR') : formatMoney(minor, 'KHR'))
  const time = (minutes: number) => (locale === 'km' ? durationKm(minutes) : `${minutes} min`)
  const count = (value: number) => (locale === 'km' ? toKhmerDigits(value) : String(value))

  return (
    <BrowserMockup
      url="moni.cam/app"
      className="rounded-[24px] border-separator bg-surface shadow-[0_24px_80px_-40px_rgba(0,0,0,0.55)]"
    >
      <div className="relative overflow-hidden bg-surface p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3 px-2 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green text-label">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-label">{copy.demo.title}</p>
            <p className="text-xs text-label-2">{copy.demo.label}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-separator px-2.5 py-1 text-xs text-label-2">
          {copy.demo.example}
        </span>
      </div>

      <div className="rounded-[var(--radius-well)] border border-separator bg-surface-2 p-4 sm:p-5">
        <label htmlFor="marketing-demo-description" className="sr-only">
          {copy.demo.title}
        </label>
        <textarea
          id="marketing-demo-description"
          readOnly
          value={replaying ? typed : full}
          rows={2}
          aria-label={full}
          className="block min-h-[4.25rem] w-full resize-none border-0 bg-transparent p-0 text-base leading-relaxed text-label outline-none sm:text-lg"
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-separator pt-3">
          <span className="flex items-center gap-2 text-xs text-label-2">
            <span className="size-1.5 rounded-full bg-green" aria-hidden />
            {copy.demo.privateNote}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={replay}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-separator px-3 text-xs font-medium text-label transition-colors hover:bg-surface focus-visible:ring-2 focus-visible:ring-green"
              aria-label={copy.demo.voice}
            >
              <Mic className="size-3.5" aria-hidden />
              <span>{copy.demo.voice}</span>
            </button>
            <button
              type="button"
              onClick={replay}
              className="inline-flex size-9 items-center justify-center rounded-full bg-label text-surface transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-green"
              aria-label={copy.demo.replay}
              title={copy.demo.replay}
            >
              <RotateCcw className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-[var(--radius-well)] border border-separator bg-surface-2">
        <table className="w-full text-left">
          <caption className="sr-only">{copy.demo.caption}</caption>
          <thead>
            <tr className="border-b border-separator">
              {copy.demo.tableHead.map((heading) => (
                <th key={heading} scope="col" className="px-3 py-2 text-xs font-medium text-label-2 sm:px-4">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, index) => (
              <motion.tr
                key={`${row.name_en}-${replayKey}`}
                initial={replayKey ? { opacity: 0, y: 7 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 34, delay: replayKey ? index * 0.07 : 0 }}
                className="border-b border-separator last:border-0"
              >
                <td className="px-3 py-3 text-sm text-label sm:px-4">{locale === 'km' ? row.name : row.name_en}</td>
                <td className="tnum px-3 py-3 text-sm font-medium text-label sm:px-4">{price(row.price_minor)}</td>
                <td className="tnum px-3 py-3 text-sm text-label-2 sm:px-4">{time(row.duration_min)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center gap-2 border-t border-separator px-3 py-2.5 text-xs text-label-2 sm:px-4" aria-live="polite">
          <Check className="size-3.5 text-accent-strong" aria-hidden />
          <span>{replaying ? copy.demo.label : copy.demo.ready}</span>
          <span className="tnum ml-auto text-label-3">{count(ROWS.length)}</span>
        </div>
      </div>

      <p className="px-2 pt-3 text-sm text-label-2">{copy.demo.caption}</p>
      </div>
    </BrowserMockup>
  )
}
