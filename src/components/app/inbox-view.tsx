'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, CircleAlert, LoaderCircle, Send, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'
import type { InboxRow, Transcript } from '@/lib/queries/inbox.ts'
import { toKhmerDigits } from '@/lib/format/khmer.ts'
import { ChannelIcon, channelLabel } from './channel-icon.tsx'

/**
 * The universal control surface. Every conversation from every channel in one
 * list, escalations first, and the full transcript of what was promised in the
 * owner's name.
 *
 * The reply box is deliberately plain. An owner answering a customer at 9pm from
 * a phone needs a text field and a send button, not a composer.
 */
function timeLabel(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Phnom_Penh',
  }).format(new Date(iso))
}

/**
 * The first transcript is rendered by the server, so opening the inbox paints a
 * conversation rather than a spinner, and there is no effect here at all: a
 * thread loads because someone asked for it.
 */
export function InboxView({ rows, initialTranscript }: { rows: InboxRow[]; initialTranscript: Transcript | null }) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(initialTranscript?.id ?? rows[0]?.id ?? null)
  const [transcript, setTranscript] = useState<Transcript | null>(initialTranscript)
  const [loading, setLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState('')
  const [, startTransition] = useTransition()

  const load = useCallback(async (id: string) => {
    setLoading(true)
    setNotice('')
    try {
      const response = await fetch(`/api/conversations/${id}`)
      const body = await response.json()
      if (!response.ok || body.error) throw new Error(body.error ?? 'load failed')
      setTranscript(body as Transcript)
    } catch {
      setTranscript(null)
      setNotice('មិនអាចបើកការសន្ទនានេះបានទេ។')
    } finally {
      setLoading(false)
    }
  }, [])

  function open(id: string) {
    setOpenId(id)
    void load(id)
  }

  async function send(resume: boolean) {
    if (!openId || !reply.trim()) return
    setSending(true)
    setNotice('')
    try {
      const response = await fetch(`/api/conversations/${openId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: reply.trim(), resume }),
      })
      const body = await response.json()
      if (!response.ok || body.error) throw new Error(body.error ?? 'send failed')
      setReply('')
      // An undelivered reply is still stored, so say which happened rather than
      // showing a tick the customer never saw.
      if (!body.delivered) setNotice(body.reason ?? 'សារត្រូវបានរក្សាទុក ប៉ុន្តែមិនបានផ្ញើទេ។')
      await load(openId)
      startTransition(() => router.refresh())
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'មិនអាចផ្ញើបានទេ។')
    } finally {
      setSending(false)
    }
  }

  /**
   * The owner saw the riel land in her own banking app. One tap here is the
   * whole verification for a QR paid into the shop's account; the server
   * refuses a second tap on the same code, so the button cannot double-confirm.
   */
  async function confirmPaid(code: string) {
    if (!openId) return
    setSending(true)
    setNotice('')
    try {
      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const body = await response.json()
      if (!response.ok || body.error) throw new Error(body.error ?? 'confirm failed')
      if (body.outcome === 'already_paid') setNotice(`${code} បានបញ្ជាក់រួចហើយ។`)
      else if (body.outcome === 'not_found') setNotice(`រកមិនឃើញការទូទាត់សម្រាប់ ${code} ទេ។`)
      else if (!body.customer_told) setNotice('បានកត់ថាទទួលប្រាក់ ប៉ុន្តែមិនអាចផ្ញើប្រាប់អតិថិជនបានទេ។')
      await load(openId)
      startTransition(() => router.refresh())
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'មិនអាចបញ្ជាក់បានទេ។')
    } finally {
      setSending(false)
    }
  }

  async function handBack() {
    if (!openId) return
    setSending(true)
    try {
      await fetch(`/api/conversations/${openId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' } })
      await load(openId)
      startTransition(() => router.refresh())
    } finally {
      setSending(false)
    }
  }

  if (rows.length === 0) {
    return (
      <p className="km border border-rule/70 px-3 py-6 text-center text-sm text-rule">
        មិនទាន់មានសារពីអតិថិជនទេ។ ភ្ជាប់ Telegram រួច សារនឹងមកទីនេះ។
      </p>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
      <ul className="divide-y divide-hairline border border-rule/70">
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => open(row.id)}
              aria-current={row.id === openId}
              className={`flex w-full items-start gap-2 px-3 py-3 text-left ${row.id === openId ? 'bg-ink/5' : ''}`}
            >
              <ChannelIcon channel={row.channel} className="mt-0.5 size-4 shrink-0 text-rule" />
              <span className="min-w-0 flex-1">
                <span className="km flex items-center gap-2 text-sm font-semibold text-ink">
                  {row.customerName}
                  {row.status === 'needs_owner' ? (
                    <span className="km inline-flex items-center gap-1 text-xs font-normal text-seal-text">
                      <CircleAlert className="size-3.5" strokeWidth={1.75} aria-hidden />
                      ត្រូវការអ្នក
                    </span>
                  ) : null}
                </span>
                <span className="km mt-0.5 line-clamp-2 block text-xs text-rule">{row.preview ?? channelLabel(row.channel)}</span>
              </span>
              <span className="tnum shrink-0 text-xs text-rule">{timeLabel(row.lastMessageAt)}</span>
            </button>
          </li>
        ))}
      </ul>

      <section className="border border-rule/70">
        <header className="flex items-center gap-2 border-b border-hairline px-3 py-2">
          <UserRound className="size-4 shrink-0 text-rule" strokeWidth={1.75} aria-hidden />
          <h2 className="km text-sm font-semibold text-ink">{transcript?.customerName ?? 'ការសន្ទនា'}</h2>
          {transcript ? (
            <span className="km ml-auto text-xs text-rule">{channelLabel(transcript.channel)}</span>
          ) : null}
        </header>

        <div className="max-h-[26rem] overflow-y-auto px-3 py-3">
          {loading ? (
            <p className="km flex items-center gap-2 text-sm text-rule">
              <LoaderCircle className="size-4 animate-spin" strokeWidth={1.75} aria-hidden />
              កំពុងបើក
            </p>
          ) : (
            <ol className="flex flex-col gap-3">
              {transcript?.messages.map((message) => (
                <li key={message.id} className={message.role === 'customer' ? '' : 'pl-6'}>
                  <p className="km text-xs text-rule">
                    {message.role === 'customer'
                      ? transcript.customerName
                      : message.role === 'owner'
                        ? 'អ្នក'
                        : message.role === 'ai'
                          ? 'Moni'
                          : 'កំណត់ត្រា'}
                    {' · '}
                    <span className="tnum">{timeLabel(message.createdAt)}</span>
                  </p>
                  <p className="km mt-0.5 whitespace-pre-wrap text-sm text-ink">{message.body}</p>
                </li>
              ))}
            </ol>
          )}
        </div>

        {transcript && transcript.pendingPayments.length > 0 ? (
          <ul className="divide-y divide-hairline border-t border-hairline">
            {transcript.pendingPayments.map((payment) => (
              <li key={payment.code} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="km min-w-0 flex-1 text-sm text-ink">
                  រង់ចាំប្រាក់ <span className="tnum font-semibold">{payment.amount}</span> សម្រាប់
                  {payment.kind === 'order' ? ' ការបញ្ជាទិញ ' : ' ការណាត់ '}
                  {payment.code}
                  {/* What she is confirming, not just what it is called. An
                      order's lines are the only way to tell two 23,000 riel
                      orders apart in a busy hour. */}
                  {payment.lines.length > 0 ? (
                    <span className="km block text-xs text-rule">
                      {payment.lines
                        .map((line) => `${line.name} ×${toKhmerDigits(line.quantity)}`)
                        .join('៖ ')}
                    </span>
                  ) : null}
                  {payment.provider === 'khqr' ? (
                    <span className="km block text-xs text-rule">ចូលគណនី Bakong របស់ហាងផ្ទាល់។ ពិនិត្យកម្មវិធីធនាគាររបស់អ្នក រួចបញ្ជាក់។</span>
                  ) : null}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void confirmPaid(payment.code)}
                  disabled={sending}
                  className="km min-h-11 rounded-none"
                >
                  <BadgeCheck data-icon="inline-start" aria-hidden />
                  បានទទួលប្រាក់ហើយ
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="border-t border-hairline px-3 py-3">
          {transcript?.status === 'needs_owner' ? (
            <p className="km mb-2 text-xs text-seal-text">
              Moni បានផ្ទេរមកអ្នក{transcript.needsOwnerReason ? `៖ ${transcript.needsOwnerReason}` : ''}
            </p>
          ) : null}

          <Textarea
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            disabled={sending || !transcript}
            rows={3}
            placeholder="ឆ្លើយក្នុងនាមហាងរបស់អ្នក"
            className="km resize-none rounded-none border-rule/70 bg-paper text-base shadow-none placeholder:text-rule md:text-base"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void send(false)}
              disabled={sending || !reply.trim()}
              className="km min-h-11 rounded-none"
            >
              {sending ? <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden /> : <Send data-icon="inline-start" aria-hidden />}
              ផ្ញើ
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void send(true)}
              disabled={sending || !reply.trim()}
              className="km min-h-11 rounded-none"
            >
              ផ្ញើ រួចប្រគល់ឱ្យ Moni
            </Button>
            {transcript?.status === 'needs_owner' ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => void handBack()}
                disabled={sending}
                className="km min-h-11 rounded-none"
              >
                ប្រគល់ឱ្យ Moni វិញ
              </Button>
            ) : null}
          </div>
          {notice ? <p role="alert" className="km mt-2 text-xs text-rule">{notice}</p> : null}
        </div>
      </section>
    </div>
  )
}
