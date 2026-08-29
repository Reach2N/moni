'use client'

// Hand-built after checking the vendored shadcn Input, Label, and Button.
// The landing page needs an application state machine, a honeypot, and an
// accessible confirmation trail that those primitives do not provide together.

import { useEffect, useRef, useState } from 'react'
import { Check, ExternalLink, Loader2 } from 'lucide-react'
import { motion } from 'motion/react'
import type { Copy, Locale } from '@/lib/marketing/copy'

type State = 'idle' | 'sending' | 'done' | 'error'

export function WaitlistForm({ copy, locale, appUrl }: { copy: Copy; locale: Locale; appUrl: string }) {
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')
  const successRef = useRef<HTMLDivElement>(null)
  const c = copy.waitlist

  useEffect(() => {
    if (state === 'done') successRef.current?.focus()
  }, [state])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const note = String(form.get('note') ?? '').trim()
    const website = String(form.get('website') ?? '').trim()

    setState('sending')
    setMessage('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, note, website, locale, source: 'landing' }),
      })
      if (res.ok) {
        setState('done')
        return
      }
      setState('error')
      setMessage(res.status === 429 ? c.errBusy : res.status === 400 ? c.errInvalid : c.errGeneric)
    } catch {
      setState('error')
      setMessage(c.errGeneric)
    }
  }

  if (state === 'done') {
    return (
      <motion.div
        ref={successRef}
        tabIndex={-1}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        className="outline-none"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green text-label">
            <Check className="size-5" strokeWidth={2.5} aria-hidden />
          </span>
          <div>
            <p className="text-lg font-semibold text-label">{c.okTitle}</p>
            <p className="mt-1 text-[15px] text-label-2">{c.okBody}</p>
          </div>
        </div>

        <ol className="mt-6 space-y-3">
          {c.nextSteps.map((step, index) => (
            <li key={step} className="flex items-start gap-3 text-sm text-label-2">
              <span className="tnum flex size-6 shrink-0 items-center justify-center rounded-full border border-separator text-xs font-semibold text-label">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <a
          href={appUrl}
          className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-label px-5 text-sm font-semibold text-surface transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-green"
        >
          {c.appLink}
          <ExternalLink className="size-4" aria-hidden />
        </a>
        <p className="mt-3 text-xs text-label-2">{c.appLinkNote}</p>
      </motion.div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="w-full" aria-busy={state === 'sending'}>
      <div className="space-y-5">
        <div>
          <label htmlFor="waitlist-email" className="block text-sm font-semibold text-label">
            {c.label}
          </label>
          <input
            id="waitlist-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            dir="ltr"
            placeholder={c.placeholder}
            disabled={state === 'sending'}
            className="mt-2 block h-12 w-full rounded-[var(--radius-well)] border border-separator bg-surface-2 px-4 text-base text-label placeholder:text-label-2 focus-visible:border-accent-strong focus-visible:ring-2 focus-visible:ring-green disabled:opacity-60"
          />
        </div>

        <div>
          <label htmlFor="waitlist-note" className="block text-sm font-semibold text-label">
            {c.noteLabel}
          </label>
          <textarea
            id="waitlist-note"
            name="note"
            rows={3}
            disabled={state === 'sending'}
            placeholder={c.notePlaceholder}
            className="mt-2 block w-full resize-y rounded-[var(--radius-well)] border border-separator bg-surface-2 px-4 py-3 text-base text-label placeholder:text-label-2 focus-visible:border-accent-strong focus-visible:ring-2 focus-visible:ring-green disabled:opacity-60"
          />
        </div>
      </div>

      {/* Honeypot for simple bots. It is not a replacement for durable rate limiting. */}
      <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden>
        <label htmlFor="waitlist-website">Website</label>
        <input id="waitlist-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={state === 'sending'}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-well)] bg-green px-5 text-base font-semibold text-label transition-transform active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-green disabled:opacity-70"
      >
        {state === 'sending' && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {state === 'sending' ? c.submitting : c.submit}
      </button>

      <p className="mt-3 text-xs text-label-2">{c.privacyNotice}</p>
      <p className="mt-1 text-xs text-label-2">
        <a href={locale === 'en' ? '/privacy?lang=en' : '/privacy'} className="underline underline-offset-2 hover:text-label">
          {locale === 'en' ? 'Read our privacy policy' : 'អានគោលការណ៍ឯកជនភាព'}
        </a>
      </p>

      {state === 'error' && (
        <p role="alert" className="mt-3 text-sm font-medium text-red">
          {message}
        </p>
      )}
    </form>
  )
}
