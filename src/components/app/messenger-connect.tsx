'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CircleAlert, LoaderCircle, Link2Off, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import type { ChannelStatus } from '@/lib/queries/business.ts'

/**
 * Facebook Messenger, second and honest about why.
 *
 * Messenger is the larger channel in Cambodia, and it is not first because Meta
 * requires app review before a page can message the public. That is weeks. In
 * the meantime a connected page works for admins, developers and test users of
 * the Meta app, which is enough to demonstrate and not enough to launch, and the
 * card says exactly that rather than implying a shop is live.
 */
export function MessengerConnect({ connection }: { connection: ChannelStatus | null }) {
  const router = useRouter()
  const [pageToken, setPageToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  const connected = connection?.status === 'connected'

  async function submit(method: 'POST' | 'DELETE') {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/channels/messenger', {
        method,
        headers: { 'content-type': 'application/json' },
        body: method === 'POST' ? JSON.stringify({ pageToken: pageToken.trim() }) : undefined,
      })
      const body = await response.json()
      if (!response.ok || body.error) throw new Error(body.error ?? 'request failed')
      setPageToken('')
      startTransition(() => router.refresh())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Messenger could not be reached.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="border border-rule/70">
      <header className="flex items-center gap-2 border-b border-hairline px-3 py-2">
        <MessageCircle className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        <h2 className="km text-sm font-semibold text-ink">Messenger</h2>
        {connected ? (
          <span className="km ml-auto inline-flex items-center gap-1 text-xs text-seal-text">
            <Check className="size-3.5" strokeWidth={1.75} aria-hidden />
            ភ្ជាប់រួច
          </span>
        ) : null}
      </header>

      <div className="px-3 py-3">
        <p className="km text-sm text-rule">
          Messenger ជាបណ្តាញធំជាងគេនៅកម្ពុជា។ Meta តម្រូវឱ្យពិនិត្យកម្មវិធីជាមុន ដែលចំណាយពេលច្រើនសប្តាហ៍
          ដូច្នេះពេលនេះវាដំណើរការតែជាមួយអ្នកសាកល្បងរបស់កម្មវិធីប៉ុណ្ណោះ មិនទាន់សម្រាប់អតិថិជនទូទៅទេ។
        </p>

        {connected ? (
          <>
            <p className="km mt-2 text-sm text-ink">
              Moni កំពុងឆ្លើយសារនៅ {connection?.displayName ?? 'Page'} ជំនួសអ្នក។
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
            <label htmlFor="messenger-token" className="km mt-3 block text-xs font-semibold text-rule">
              Page access token ពី Meta
            </label>
            <Input
              id="messenger-token"
              name="messenger-token"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={pageToken}
              onChange={(event) => setPageToken(event.target.value)}
              disabled={busy}
              placeholder="EAAG..."
              className="mt-1 min-h-11 rounded-none border-rule/70 bg-paper text-base shadow-none md:text-base"
            />
            <Button
              type="button"
              onClick={() => void submit('POST')}
              disabled={busy || pageToken.trim().length < 40}
              className="km mt-2 min-h-11 w-full rounded-none"
            >
              {busy ? <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden /> : <MessageCircle data-icon="inline-start" aria-hidden />}
              {busy ? 'កំពុងភ្ជាប់' : 'ភ្ជាប់ Messenger'}
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
