'use client'

import { useRef, useState } from 'react'
import { Bot, CircleAlert, HandHelping, LoaderCircle, ShieldCheck, TriangleAlert, UserRound } from 'lucide-react'
import { AgentPromptBar } from '@/components/agent/prompt-bar.tsx'
import { Button } from '@/components/ui/button.tsx'
import { describeTurn } from '@/lib/agent/trace.ts'

type Turn =
  | { role: 'customer'; text: string }
  | {
      role: 'moni'
      text: string | null
      checks: string[]
      /** Did this answer rest on the shop's own rows, or on the model alone? */
      grounded: boolean
      handedOver: boolean
      qrCode: string | null
    }

const VISITOR_KEY = 'moni.visitor'


/**
 * "Try it as a customer". `/api/chat` is the public customer endpoint and picks
 * its shop server side, so no tenant is named here.
 *
 * Every box here takes its corner from `--radius-card` rather than hardcoding
 * one, the same mechanism the prompt bar and the setup spine already use. The
 * token is 0 in the Invitation dashboard and 14px under `.moni-app-hig`, so this
 * panel is square in one place and rounded in the other WITHOUT a prop. It was
 * previously square everywhere, which put hard-cornered message boxes inside a
 * rounded container on the onboarding screen and made one screen look like two.
 *
 * It answers as the signed-in member's own shop: `chatBusiness()` in
 * `src/app/api/chat/route.ts` resolves the member through `memberGate()` and only
 * falls back to the public demo shop for a signed-out visitor. This comment said
 * the opposite for a while after Phase 3 retargeted the route.
 */
export function ChatPanel({ onChanged }: { onChanged?: () => void }) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [text, setText] = useState('')
  const [lastMessage, setLastMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [handedOver, setHandedOver] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  function visitorId() {
    let value = window.localStorage.getItem(VISITOR_KEY)
    if (!value) {
      value = `web-${crypto.randomUUID()}`
      window.localStorage.setItem(VISITOR_KEY, value)
    }
    return value
  }

  async function send(message = text) {
    const trimmed = message.trim()
    if (!trimmed || busy || handedOver) return
    setTurns((current) => [...current, { role: 'customer', text: trimmed }])
    setText('')
    setLastMessage(trimmed)
    setError('')
    setBusy(true)

    try {
      const response = await fetch('/api/chat', {
        // The model chain is allowed fifty seconds and the route sixty, so this
        // sits just past both: a timeout here means nothing is coming, never
        // that a working answer was cut off.
        signal: AbortSignal.timeout(65_000),
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ visitor_id: visitorId(), text: trimmed }),
      })
      const body = await response.json()
      if (!response.ok || body.error) throw new Error(body.error ?? 'request failed')
      const trace = describeTurn(Array.isArray(body.tool_calls) ? body.tool_calls : undefined)
      const handed = Boolean(body.handed_over)
      // A create_payment call names a booking code, and /api/pay/{code} is the
      // card a real customer would be sent. The browser is the one channel that
      // can show it inline, so the owner sees exactly what a customer sees.
      const paid = Array.isArray(body.tool_calls)
        ? (body.tool_calls as { tool?: string; args?: { code?: unknown } }[]).find((call) => call.tool === 'create_payment')
        : undefined
      const qrCode = typeof paid?.args?.code === 'string' ? paid.args.code.toUpperCase() : null
      setTurns((current) => [
        ...current,
        {
          role: 'moni',
          text: typeof body.text === 'string' ? body.text : null,
          checks: trace.steps,
          grounded: trace.grounded,
          handedOver: handed,
          qrCode,
        },
      ])
      setHandedOver(handed)
      onChanged?.()
    } catch (failure) {
      // A timeout is its own answer and deserves its own sentence: the message
      // did reach Moni, the reply did not come back, and "could not connect"
      // would be a lie about which half failed.
      const timedOut = failure instanceof DOMException && failure.name === 'TimeoutError'
      setError(
        timedOut
          ? 'Moni មិនបានឆ្លើយតបទាន់ពេលទេ។ សូមសាកម្តងទៀត។'
          : 'មិនអាចភ្ជាប់បាន។ មិនបានផ្ញើសារនេះទេ។ សូមសាកម្តងទៀត។',
      )
    } finally {
      setBusy(false)
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: 'end' }))
    }
  }

  return (
    <section aria-labelledby="customer-simulator-heading" className="flex min-h-0 flex-1 flex-col">
      <h3 id="customer-simulator-heading" className="sr-only">សាកជាអតិថិជន</h3>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {turns.length === 0 ? (
          <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-rule/70 px-4 py-3">
            <Bot className="mt-1 size-5 shrink-0 text-rule" strokeWidth={1.75} aria-hidden />
            <div>
              <p className="km text-sm font-semibold text-ink">សាកសួរដូចអតិថិជនពិត</p>
              <p className="km mt-1 text-sm text-rule">ឧ. លាបសក់ថ្លៃប៉ុន្មាន ហើយថ្ងៃស្អែកម៉ោងណាទំនេរ?</p>
            </div>
          </div>
        ) : null}

        <ul className="flex flex-col gap-3">
          {turns.map((turn, index) => (
            <li key={`${turn.role}-${index}`}>
              {turn.role === 'customer' ? (
                <div className="flex items-start justify-end gap-2">
                  <p className="km max-w-[82%] rounded-[var(--radius-card)] bg-ink px-3 py-2 text-base text-on-ink">{turn.text}</p>
                  <UserRound className="mt-1 size-4 shrink-0 text-rule" strokeWidth={1.75} aria-hidden />
                </div>
              ) : (
                <div className="max-w-[92%] rounded-[var(--radius-card)] border border-rule/70 px-3 py-2.5">
                  {/* What it actually did, and whether the answer rests on
                      anything. A reply with no lookups is not automatically
                      wrong: a greeting needs none. It is only alarming when the
                      question was about a price, and the owner is the one who
                      can tell the difference, so both cases are stated plainly
                      rather than one being hidden. */}
                  <div className="mb-2 border-b border-hairline pb-2">
                    <p
                      className={`km flex items-center gap-2 text-xs ${turn.grounded ? 'text-seal-text' : 'text-rule'}`}
                    >
                      {turn.grounded ? (
                        <ShieldCheck className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                      ) : (
                        <TriangleAlert className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                      )}
                      {turn.grounded
                        ? 'ឆ្លើយតាមទិន្នន័យក្នុងហាងរបស់អ្នក'
                        : 'មិនបានអានទិន្នន័យហាងទេ។ ចម្លើយនេះមកពីការសន្ទនាតែប៉ុណ្ណោះ'}
                    </p>
                    {turn.checks.length > 0 ? (
                      <ul className="mt-1">
                        {turn.checks.map((check, checkIndex) => (
                          <li key={`${check}-${checkIndex}`} className="km flex items-center gap-2 text-xs text-rule">
                            <Bot className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                            {check}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  {turn.text ? <p className="km whitespace-pre-wrap text-base text-ink">{turn.text}</p> : null}
                  {turn.qrCode ? (
                    // eslint-disable-next-line @next/next/no-img-element -- an SVG document from our own route, redrawn per payment and never optimised
                    <img
                      src={`/api/pay/${turn.qrCode}`}
                      alt={`KHQR សម្រាប់ការណាត់ ${turn.qrCode}`}
                      width={300}
                      height={450}
                      className="mt-2 h-auto w-full max-w-[18rem] rounded-[var(--radius-card)] border border-hairline"
                    />
                  ) : null}
                  {turn.handedOver ? (
                    <p className="km mt-2 flex items-start gap-2 border-t border-hairline pt-2 text-sm text-rule">
                      <HandHelping className="mt-1 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                      Moni ឈប់ឆ្លើយ ហើយផ្ទេរសារមកម្ចាស់ហាង។
                    </p>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>

        {busy ? (
          /* The only two things this screen actually knows while it waits: the
             message went, and no reply is back. /api/chat does not stream, so
             naming an activity here would be inventing one, which is the same
             mistake the parse trace already had scripted out of it. */
          <p className="km mt-3 flex items-center gap-2 text-sm text-rule" role="status">
            <LoaderCircle className="size-4 animate-spin" strokeWidth={1.75} aria-hidden />
            បានផ្ញើសារ។ កំពុងរង់ចាំចម្លើយ
          </p>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="border-t border-hairline p-4">
        {handedOver ? (
          <p className="km text-sm text-rule">សន្ទនានេះកំពុងរង់ចាំម្ចាស់ហាង។ Moni នឹងមិនឆ្លើយបន្ថែមទេ។</p>
        ) : (
          <AgentPromptBar
            value={text}
            onChange={setText}
            onSubmit={() => void send()}
            placeholder="សរសេរសារជាអតិថិជន…"
            submitLabel="ផ្ញើសារ"
            ariaLabel="សារអតិថិជន"
            helper="សរសេរជាភាសាខ្មែរ ឬអង់គ្លេស"
            rows={2}
            disabled={busy}
            submitDisabled={!text.trim()}
          />
        )}

        {error ? (
          <div role="alert" className="mt-3 flex items-start gap-2 rounded-[var(--radius-card)] border border-rule/70 px-3 py-2">
            <CircleAlert className="mt-1 size-4 shrink-0 text-rule" strokeWidth={1.75} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="km text-sm text-ink">{error}</p>
              <Button type="button" variant="ghost" onClick={() => void send(lastMessage)} className="km min-h-11 rounded-none px-0">សាកម្តងទៀត</Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
