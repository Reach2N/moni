'use client'

import { useRef, useState } from 'react'
import { Bot, CircleAlert, HandHelping, LoaderCircle, UserRound } from 'lucide-react'
import { AgentPromptBar } from '@/components/agent/prompt-bar.tsx'
import { Button } from '@/components/ui/button.tsx'

type Turn =
  | { role: 'customer'; text: string }
  | { role: 'moni'; text: string | null; checks: string[]; handedOver: boolean }

const VISITOR_KEY = 'moni.visitor'

const CUSTOMER_STEP: Record<string, string> = {
  get_business: 'Moni បានពិនិត្យព័ត៌មានហាង',
  list_services: 'Moni បានពិនិត្យសេវា និងតម្លៃ',
  list_slots: 'Moni បានពិនិត្យពេលទំនេរ',
  create_booking: 'Moni បានកត់ការណាត់',
  reschedule_booking: 'Moni បានប្ដូរពេលការណាត់',
  cancel_booking: 'Moni បានលុបការណាត់',
  create_payment: 'Moni បានរៀបចំការទូទាត់',
  escalate_to_owner: 'Moni បានផ្ទេរសារមកម្ចាស់ហាង',
}

/**
 * "Try it as a customer". `/api/chat` is the public customer endpoint and picks
 * its shop server side, so no tenant is named here.
 *
 * Honest limitation until Phase 3 retargets that route: it still answers as the
 * fixed demo shop, not as the signed-in member's. The owner sees the assistant's
 * behaviour, not their own catalogue.
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
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ visitor_id: visitorId(), text: trimmed }),
      })
      const body = await response.json()
      if (!response.ok || body.error) throw new Error(body.error ?? 'request failed')
      const checks = Array.isArray(body.tool_calls)
        ? body.tool_calls.map((call: { tool?: string }) => CUSTOMER_STEP[call.tool ?? '']).filter(Boolean)
        : []
      const handed = Boolean(body.handed_over)
      setTurns((current) => [
        ...current,
        { role: 'moni', text: typeof body.text === 'string' ? body.text : null, checks, handedOver: handed },
      ])
      setHandedOver(handed)
      onChanged?.()
    } catch {
      setError('មិនអាចភ្ជាប់បាន។ មិនបានផ្ញើសារនេះទេ។ សូមសាកម្តងទៀត។')
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
          <div className="flex items-start gap-3 border border-rule/70 px-4 py-3">
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
                  <p className="km max-w-[82%] bg-ink px-3 py-2 text-base text-on-ink">{turn.text}</p>
                  <UserRound className="mt-1 size-4 shrink-0 text-rule" strokeWidth={1.75} aria-hidden />
                </div>
              ) : (
                <div className="max-w-[92%] border border-rule/70 px-3 py-2.5">
                  {turn.checks.length > 0 ? (
                    <ul className="mb-2 border-b border-hairline pb-2">
                      {turn.checks.map((check) => (
                        <li key={check} className="km flex items-center gap-2 text-xs text-rule">
                          <Bot className="size-3.5" strokeWidth={1.75} aria-hidden />
                          {check}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {turn.text ? <p className="km whitespace-pre-wrap text-base text-ink">{turn.text}</p> : null}
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
          <p className="km mt-3 flex items-center gap-2 text-sm text-rule" role="status">
            <LoaderCircle className="size-4" strokeWidth={1.75} aria-hidden />
            Moni កំពុងពិនិត្យតម្លៃ និងពេលទំនេរពីហាង
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
          <div role="alert" className="mt-3 flex items-start gap-2 border border-rule/70 px-3 py-2">
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
