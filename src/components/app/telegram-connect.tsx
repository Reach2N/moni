'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CircleAlert, LoaderCircle, Link2Off, Send } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import type { ChannelStatus } from '@/lib/queries/business.ts'

/**
 * Paste a BotFather token, and the shop starts answering on Telegram.
 *
 * Telegram is first because this is the whole setup: two minutes in BotFather
 * and one paste. Messenger needs Meta app review, measured in weeks, which is
 * why it is Phase 6 and why the pitch says exactly that.
 *
 * The token is a password. It goes straight to the server, is never held in a
 * URL, and is cleared from the field the moment it is accepted.
 */
export function TelegramConnect({ connection }: { connection: ChannelStatus | null }) {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  const connected = connection?.status === 'connected'

  async function submit(method: 'POST' | 'DELETE') {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/channels/telegram', {
        method,
        headers: { 'content-type': 'application/json' },
        body: method === 'POST' ? JSON.stringify({ token: token.trim() }) : undefined,
      })
      const body = await response.json()
      if (!response.ok || body.error) throw new Error(body.error ?? 'request failed')
      setToken('')
      startTransition(() => router.refresh())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Telegram could not be reached.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="border border-rule/70">
      <header className="flex items-center gap-2 border-b border-hairline px-3 py-2">
        <Send className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        <h2 className="km text-sm font-semibold text-ink">Telegram</h2>
        {connected ? (
          <span className="km ml-auto inline-flex items-center gap-1 text-xs text-seal-text">
            <Check className="size-3.5" strokeWidth={1.75} aria-hidden />
            ភ្ជាប់រួច
          </span>
        ) : null}
      </header>

      <div className="px-3 py-3">
        {connected ? (
          <>
            <p className="km text-sm text-ink">
              Moni កំពុងឆ្លើយសារនៅ {connection?.displayName ?? 'Telegram'} ជំនួសអ្នក។
            </p>
            <p className="km mt-1 text-xs text-rule">
              សាកផ្ញើសារទៅបុតរបស់អ្នកពីទូរស័ព្ទ ដើម្បីមើលការឆ្លើយតប។
            </p>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void submit('DELETE')}
              disabled={busy}
              className="km mt-2 min-h-11 rounded-none px-0"
            >
              {busy ? <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden /> : <Link2Off data-icon="inline-start" aria-hidden />}
              ផ្តាច់ការភ្ជាប់
            </Button>
          </>
        ) : (
          <>
            <p className="km text-sm text-rule">
              បើក Telegram រកឈ្មោះ BotFather សរសេរ /newbot រួចចម្លងលេខសម្ងាត់មកដាក់ទីនេះ។
            </p>
            <label htmlFor="telegram-token" className="km mt-3 block text-xs font-semibold text-rule">
              លេខសម្ងាត់ពី BotFather
            </label>
            <Input
              id="telegram-token"
              name="telegram-token"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={token}
              onChange={(event) => setToken(event.target.value)}
              disabled={busy}
              placeholder="123456789:AA..."
              className="mt-1 min-h-11 rounded-none border-rule/70 bg-paper text-base shadow-none md:text-base"
            />
            <Button
              type="button"
              onClick={() => void submit('POST')}
              disabled={busy || token.trim().length < 20}
              className="km mt-2 min-h-11 w-full rounded-none"
            >
              {busy ? <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden /> : <Send data-icon="inline-start" aria-hidden />}
              {busy ? 'កំពុងភ្ជាប់' : 'ភ្ជាប់ Telegram'}
            </Button>
          </>
        )}

        {error || connection?.lastError ? (
          <p role="alert" className="km mt-2 flex items-start gap-2 text-xs text-rule">
            <CircleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            {error || connection?.lastError}
          </p>
        ) : null}
      </div>
    </section>
  )
}
