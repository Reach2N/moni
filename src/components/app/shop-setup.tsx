'use client'

import { useState } from 'react'
import { ArrowLeft, Check, CircleAlert, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { VoiceNote } from './voice-note.tsx'
import { AgentPromptBar } from '@/components/agent/prompt-bar.tsx'
import { AgentThinking, type ThinkingStep } from '@/components/agent/agent-thinking.tsx'
import { AgentApprovalCard } from '@/components/agent/approval-card.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'
import type { ParseResponse } from '@/lib/parse-types.ts'
import { sanityCheck } from '@/lib/ai/sanity.ts'
import { moneyKm, toKhmerDigits } from './dashboard-format.ts'

const SAMPLE =
  'កាត់សក់ 15000៛ 30 នាទី។ លាបសក់ 45000៛ ១ម៉ោងកន្លះ។ សក់អ៊ុត 60000៛ ២ម៉ោង។ លាងសក់ 8000៛។ Open 8am to 7pm, Monday to Saturday. Closed Sunday. Two staff.'

type SetupState = 'describe' | 'parsing' | 'review' | 'saving' | 'saved' | 'error'

/** A parse failure the OWNER can do something about, carrying the route's words. */
class ParseFailure extends Error {
  constructor(message: string, readonly actionable: boolean) {
    super(message)
  }
}

/** Service warnings name their row as `services[2] "Haircut"`, per sanityCheck in lib/ai/sanity.ts. */
function warningsByService(warnings: readonly { field: string; issue: string }[]) {
  const byIndex = new Map<number, string[]>()
  const other: string[] = []
  for (const warning of warnings) {
    const match = /^services\[(\d+)\]/.exec(warning.field)
    if (!match) {
      other.push(warning.issue)
      continue
    }
    const index = Number(match[1])
    byIndex.set(index, [...(byIndex.get(index) ?? []), warning.issue])
  }
  return { byIndex, other }
}

export function ShopSetup({
  onSaved,
  initialInstructions = null,
  initialShopName = null,
}: {
  onSaved: () => void
  /** What the owner has already taught the assistant, so a re-save does not lose it. */
  initialInstructions?: string | null
  /**
   * The name the shop is stored under today. A member's business is claimed with
   * the local part of their email (`src/lib/queries/member.ts`), so until this
   * screen writes one the shop is named after the owner's inbox. `/api/setup`
   * has always accepted `business.name`; nothing was ever sending it.
   */
  initialShopName?: string | null
}) {
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState(initialInstructions ?? '')
  const [shopName, setShopName] = useState(initialShopName ?? '')
  const [parsed, setParsed] = useState<ParseResponse | null>(null)
  const [state, setState] = useState<SetupState>('describe')
  const [error, setError] = useState('')
  const [parseSteps, setParseSteps] = useState<ThinkingStep[]>([])
  // Whether the box currently holds the sample text rather than the owner's own
  // words. It only ever gets there by a deliberate tap now, and this is the line
  // that says so, because a description the owner did not write is one save away
  // from becoming their real catalogue.
  const [sampleFilled, setSampleFilled] = useState(false)
  // Said when a submit arrives with too little to work on. It used to be answered
  // by writing SAMPLE into the box, which meant two presses of the same button
  // saved a fictional salon as the owner's real catalogue.
  const [tooShort, setTooShort] = useState(false)

  /**
   * The review table is now the place a missing catalogue gets filled in, not
   * just corrected. A parse that found no service (an owner who opened with
   * "I want to start a coffee shop") lands here with an empty list, and this is
   * the one action that moves them forward.
   */
  function addService() {
    setParsed((current) => {
      if (!current) return current
      return {
        ...current,
        shop: {
          ...current.shop,
          services: [
            ...current.shop.services,
            {
              name: '',
              name_en: null,
              // Zero, never a guess. sanityCheck flags a zero price and the save
              // is blocked until the owner replaces it, which is the whole point:
              // a made-up price is how Moni ends up telling a customer the coffee
              // is free.
              price_minor: 0,
              currency: current.shop.default_currency,
              duration_min: 30,
              buffer_min: 0,
              unit: 'session',
            },
          ],
        },
      }
    })
  }

  function removeService(index: number) {
    setParsed((current) => {
      if (!current) return current
      return {
        ...current,
        shop: {
          ...current.shop,
          services: current.shop.services.filter((_, i) => i !== index),
        },
      }
    })
  }

  function updateService(
    index: number,
    field: 'name' | 'price_minor' | 'duration_min',
    value: string | number,
  ) {
    setParsed((current) => {
      if (!current) return current
      return {
        ...current,
        shop: {
          ...current.shop,
          services: current.shop.services.map((service, serviceIndex) =>
            serviceIndex === index ? { ...service, [field]: value } : service,
          ),
        },
      }
    })
  }

  async function parse() {
    if (description.trim().length < 8) {
      setTooShort(true)
      return
    }
    setTooShort(false)
    setParsed(null)
    setState('parsing')
    setError('')
    // Two steps, not three, because /api/parse is one non-streaming request and
    // there are only two moments this screen can honestly report: the response
    // arrived, and it parsed. A third step would be decoration, which is the
    // thing forking this component away from its scripted original was meant to end.
    setParseSteps([
      { label: 'ផ្ញើពិពណ៌នាទៅ Moni', done: false },
      { label: 'រៀបចំសេវា តម្លៃ និងម៉ោង', done: false },
    ])
    try {
      const response = await fetch('/api/parse', {
        // The last line of defence against a spinner that never stops. The
        // router already gives up on a stalled model and the route has its own
        // platform limit, but neither protects a browser from a connection that
        // simply hangs, and this screen is the product's first impression. Set
        // above the route's own budget so a server that IS working is never cut
        // off by the client: a timeout here means nothing is coming.
        signal: AbortSignal.timeout(35_000),
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: description }),
      })
      // The request is away and a response has arrived. That is the first thing
      // this screen actually knows, so it is the first thing it claims.
      setParseSteps((s) => s.map((step, i) => (i === 0 ? { ...step, done: true } : step)))
      const body = await response.json()
      if (!response.ok || body.error) {
        // A 4xx is the caller's problem and the route says what is wrong, so
        // show that instead of a generic line. Anything else is ours: the
        // owner cannot act on a model error, only on the reassurance that
        // nothing was changed.
        throw new ParseFailure(body.error ?? 'parse failed', response.status < 500)
      }
      setParseSteps((s) => s.map((step) => ({ ...step, done: true })))
      const result = body as ParseResponse
      // Only when the owner actually named the shop, and only over a box they
      // have not filled themselves. The model is told an owner's personal name is
      // not a shop name, so what arrives here is either a real name or null.
      if (result.shop.name && !shopName.trim()) setShopName(result.shop.name)
      setParsed(result)
      setState('review')
    } catch (failure) {
      const actionable = failure instanceof ParseFailure && failure.actionable
      // A timeout is its own answer and deserves its own sentence. "Moni could
      // not read your shop" is wrong when the truth is that nothing came back,
      // and the owner's next move is different: wait and press again, rather
      // than rewrite what she typed.
      const timedOut = failure instanceof DOMException && failure.name === 'TimeoutError'
      setError(
        timedOut
          ? 'Moni មិនបានឆ្លើយតបទាន់ពេល។ ទិន្នន័យហាងមិនបានប្តូរទេ។ សូមសាកម្តងទៀត។'
          : actionable
            ? (failure as ParseFailure).message
            : 'Moni មិនអាចអានព័ត៌មានហាងបាន។ ទិន្នន័យហាងមិនបានប្តូរទេ។',
      )
      setState('error')
    }
  }

  async function save() {
    if (!parsed) return
    setState('saving')
    setError('')
    const trimmedName = shopName.trim()
    const payload = {
      raw_description: description,
      model: parsed.model,
      // Absent leaves the stored name alone. The block is only sent when the
      // owner has actually given a name and it differs from what is stored, so a
      // re-save from the dashboard sheet never rewrites the shop's name with a
      // stale copy of it.
      ...(trimmedName && trimmedName !== (initialShopName ?? '').trim()
        ? { business: { name: trimmedName } }
        : {}),
      // Absent and null are different answers to the setup contract: absent
      // leaves what is stored, null clears it. An owner who empties the box
      // means to clear it.
      ai_instructions: instructions.trim() ? instructions.trim() : null,
      shop: {
        business_type: parsed.shop.business_type,
        default_currency: parsed.shop.default_currency,
        hours: parsed.shop.hours,
        resource_count: parsed.shop.resource_count,
        notes: parsed.shop.notes,
        services: parsed.shop.services.map((service) => ({
          ...service,
          description: null,
          capacity: 1,
          requires_deposit: false,
          deposit_minor: null,
        })),
      },
    }

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await response.json()
      if (!response.ok || body.error) throw new Error(body.error ?? 'save failed')
      setState('saved')
      onSaved()
    } catch {
      setError('មិនអាចបញ្ជាក់ថាបានរក្សាទុកទេ។ សូមពិនិត្យអ៊ីនធឺណិត ហើយសាកម្តងទៀត។')
      setState('error')
    }
  }

  const busy = state === 'parsing' || state === 'saving'
  /**
   * What still has to be true before this can be saved, in the owner's words.
   *
   * These are not style preferences: `SetupRequestSchema` rejects an empty
   * catalogue and a blank service name outright, and a zero price is the one
   * mistake sanityCheck calls the most expensive thing it can catch, because the
   * agent quotes `services.price_minor` verbatim to a customer. A disabled button
   * with no reason beside it is its own defect, so the reasons are rendered.
   */
  const reviewServices = parsed?.shop.services ?? []
  const blockers: string[] = []
  if (reviewServices.length === 0) {
    blockers.push('បន្ថែមសេវាយ៉ាងតិចមួយ មុនពេលរក្សាទុក')
  } else {
    if (reviewServices.some((service) => !service.name.trim())) {
      blockers.push('សេវាខ្លះមិនទាន់មានឈ្មោះ')
    }
    if (reviewServices.some((service) => service.price_minor === 0)) {
      blockers.push('សេវាខ្លះមិនទាន់មានតម្លៃ')
    }
  }
  const canSave = blockers.length === 0
  // Recomputed on every edit, not read from the parse response: a warning that
  // survives the correction it asked for teaches the owner to ignore warnings,
  // and this screen exists to earn their trust in the parse.
  const liveWarnings = parsed ? sanityCheck(parsed.shop) : []
  const { byIndex: serviceWarnings, other: otherWarnings } = warningsByService(liveWarnings)
  // An error with a parse still on hand stays on the review step: the owner's
  // corrections are the only copy of that data, and the retry inside the error
  // banner below calls save() again, which needs the table it is retrying to be
  // visible. Only a parse failure, which has no table to show, falls through to
  // the describe view.
  const showReview = state === 'review' || state === 'saving' || state === 'saved' || (state === 'error' && parsed !== null)

  return (
    <div className="flex flex-col gap-4 px-4 pb-8" aria-live="polite" aria-busy={busy}>
      {showReview ? (
        <>
          <div className="flex items-center justify-between gap-3 border-y border-hairline py-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setParsed(null)
                setError('')
                setSampleFilled(false)
                setState('describe')
              }}
              disabled={busy}
              className="km min-h-11 rounded-none px-0"
            >
              <ArrowLeft data-icon="inline-start" aria-hidden />
              កែពិពណ៌នា
            </Button>
            <p className="km tnum text-xs text-rule">{toKhmerDigits(parsed?.shop.services.length ?? 0)} សេវា</p>
          </div>

          <div className="border border-rule/70">
            <header className="border-b border-hairline px-3 py-2">
              <h3 className="km text-sm font-semibold text-ink">ពិនិត្យមុនរក្សាទុក</h3>
              <p className="km text-xs text-rule">កែឈ្មោះ តម្លៃ ឬរយៈពេល។ Moni នឹងប្រើតែទិន្នន័យដែលអ្នករក្សាទុក។</p>
            </header>
            <div className="border-b border-hairline px-3 py-3">
              <label className="km block text-xs font-semibold text-rule" htmlFor="shop-name">
                ឈ្មោះហាង
              </label>
              <Input
                id="shop-name"
                value={shopName}
                maxLength={120}
                disabled={busy || state === 'saved'}
                onChange={(event) => setShopName(event.target.value)}
                placeholder="ឈ្មោះដែលអតិថិជនស្គាល់ហាងរបស់អ្នក"
                className="km mt-1 min-h-11 rounded-none border-rule/70 bg-paper text-base shadow-none placeholder:text-rule md:text-base"
              />
            </div>
            <ul>
              {parsed?.shop.services.map((service, index) => (
                <li key={`service-${index}`} className="border-t border-hairline px-3 py-3 first:border-t-0">
                  <div className="flex items-center justify-between gap-2">
                    <label className="km block text-xs font-semibold text-rule" htmlFor={`service-name-${index}`}>
                      ឈ្មោះសេវា
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeService(index)}
                      disabled={busy || state === 'saved'}
                      className="km h-8 min-h-8 rounded-none px-1 text-xs text-rule"
                    >
                      <Trash2 data-icon="inline-start" aria-hidden />
                      លុប
                    </Button>
                  </div>
                  <Input
                    id={`service-name-${index}`}
                    value={service.name}
                    maxLength={120}
                    onChange={(event) => updateService(index, 'name', event.target.value)}
                    className="km mt-1 min-h-11 rounded-none border-rule/70 bg-paper text-base shadow-none md:text-base"
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="km text-xs font-semibold text-rule" htmlFor={`service-price-${index}`}>
                      តម្លៃ {service.currency === 'USD' ? 'USD' : '៛'}
                      <Input
                        id={`service-price-${index}`}
                        type="number"
                        min={0}
                        step={service.currency === 'USD' ? 1 : 100}
                        value={service.price_minor}
                        onChange={(event) => updateService(index, 'price_minor', Math.max(0, Number(event.target.value)))}
                        className="tnum mt-1 min-h-11 rounded-none border-rule/70 bg-paper text-base shadow-none md:text-base"
                      />
                    </label>
                    <label className="km text-xs font-semibold text-rule" htmlFor={`service-duration-${index}`}>
                      រយៈពេល នាទី
                      <Input
                        id={`service-duration-${index}`}
                        type="number"
                        min={5}
                        step={5}
                        value={service.duration_min}
                        onChange={(event) => updateService(index, 'duration_min', Math.max(5, Number(event.target.value)))}
                        className="tnum mt-1 min-h-11 rounded-none border-rule/70 bg-paper text-base shadow-none md:text-base"
                      />
                    </label>
                  </div>
                  <p className="km tnum mt-2 text-xs text-rule">
                    {moneyKm(service.price_minor, service.currency === 'USD' ? 'USD' : 'KHR')} · {toKhmerDigits(service.duration_min)} នាទី
                  </p>
                  {(serviceWarnings.get(index) ?? []).map((issue, warningIndex) => (
                    <p
                      key={`${index}-${warningIndex}`}
                      className="km mt-2 flex items-start gap-1.5 border-t border-hairline pt-2 text-xs text-ink"
                    >
                      <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                      {issue}
                    </p>
                  ))}
                </li>
              ))}
              {reviewServices.length === 0 && (
                <li className="km px-3 py-4 text-sm text-rule">
                  Moni មិនឃើញសេវាណាមួយក្នុងពិពណ៌នារបស់អ្នកទេ។ បន្ថែមមួយខាងក្រោម ឬត្រឡប់ទៅកែពិពណ៌នា។
                </li>
              )}
            </ul>
            <div className="border-t border-hairline px-3 py-2">
              <Button
                type="button"
                variant="ghost"
                onClick={addService}
                disabled={busy || state === 'saved'}
                className="km min-h-11 rounded-none px-0"
              >
                <Plus data-icon="inline-start" aria-hidden />
                បន្ថែមសេវា
              </Button>
            </div>
          </div>

          {otherWarnings.length > 0 ? (
            <div className="border border-rule/70 px-3 py-2">
              <p className="km text-sm font-semibold text-ink">មានព័ត៌មានត្រូវពិនិត្យ</p>
              {otherWarnings.map((issue, warningIndex) => (
                <p key={warningIndex} className="km mt-1 text-xs text-rule">{issue}</p>
              ))}
            </div>
          ) : null}

          <div className="border border-rule/70 px-3 py-3">
            <label htmlFor="ai-instructions" className="km text-sm font-semibold text-ink">
              អ្វីដែល Moni គួរដឹងជានិច្ច
            </label>
            <p className="km mt-1 text-xs text-rule">
              ឧទាហរណ៍ ជូនប្រូម៉ូសិនថ្ងៃសុក្រជានិច្ច ឬ មិនបញ្ចុះតម្លៃទេ។ ទុកទទេក៏បាន។
            </p>
            <Textarea
              id="ai-instructions"
              name="ai-instructions"
              autoComplete="off"
              value={instructions}
              maxLength={2_000}
              onChange={(event) => setInstructions(event.target.value)}
              disabled={busy || state === 'saved'}
              rows={3}
              placeholder="ជូនប្រូម៉ូសិនថ្ងៃសុក្រជានិច្ច។"
              className="km mt-2 resize-none rounded-none border-rule/70 bg-paper text-base shadow-none placeholder:text-rule md:text-base"
            />
          </div>

          {state === 'saved' ? (
            <div className="flex items-start gap-3 border border-rule/70 px-3 py-3">
              <Check className="mt-1 size-5 shrink-0 text-seal-text" strokeWidth={1.75} aria-hidden />
              <div>
                <p className="km text-sm font-semibold text-ink">បានរក្សាទុកការរៀបចំហាង</p>
                <p className="km mt-1 text-sm text-rule">ផែនការហាងបានធ្វើបច្ចុប្បន្នភាពពីទិន្នន័យថ្មី។</p>
              </div>
            </div>
          ) : (
            <>
              {blockers.length > 0 && (
                <div role="status" className="border border-rule/70 px-3 py-2">
                  <p className="km text-sm font-semibold text-ink">មិនទាន់អាចរក្សាទុកបានទេ</p>
                  {blockers.map((blocker) => (
                    <p key={blocker} className="km mt-1 text-xs text-rule">{blocker}</p>
                  ))}
                </div>
              )}
              <AgentApprovalCard
                title="រក្សាទុកព័ត៌មានហាង"
                description="Moni នឹងឆ្លើយអតិថិជនតាមតម្លៃ និងម៉ោងខាងលើ។"
                command="រក្សាទុកសេវា និងម៉ោងទៅក្នុងហាង"
                details={[
                  { label: 'សេវា', value: `${toKhmerDigits(parsed?.shop.services.length ?? 0)}` },
                  { label: 'រូបិយប័ណ្ណ', value: parsed?.shop.default_currency ?? '' },
                ]}
                confirmLabel={state === 'saving' ? 'កំពុងរក្សាទុក' : 'រក្សាទុក'}
                // Not the back button above: that one discards the parse and returns
                // to the description box. This one sits below the review table the
                // owner is still looking at, so there is no cancel here at all: it
                // would land on the state they are already in, which is a dead
                // click. The "កែពិពណ៌នា" back button above is the one way back,
                // and it says plainly that it discards the parse.
                onConfirm={() => void save()}
                disabled={busy || !canSave}
              />
            </>
          )}
        </>
      ) : (
        <>
          <div>
            {/* A paragraph, not a label: AgentPromptBar renders its own sr-only label,
                and two labels on one field get concatenated into one announced name.
                `ariaLabel` below carries these exact words so what is heard matches
                what is read. */}
            <p className="km text-sm font-semibold text-ink">ពិពណ៌នាហាងជាភាសាធម្មតា</p>
            <p className="km mt-1 text-sm text-rule">ប្រាប់សេវា តម្លៃ ម៉ោងបើក និងចំនួនបុគ្គលិក ឬបន្ទប់។ និយាយក៏បាន វាយក៏បាន។</p>
          </div>
          <AgentPromptBar
            value={description}
            onChange={(value) => {
              setDescription(value)
              // The owner is typing over the sample, so the notice about it no
              // longer describes what is in the box.
              if (sampleFilled) setSampleFilled(false)
            }}
            onSubmit={parse}
            placeholder="ប្រាប់ Moni ពីហាងរបស់អ្នក៖ សេវា តម្លៃ ម៉ោងបើក"
            submitLabel="រៀបចំឱ្យខ្ញុំ"
            ariaLabel="ពិពណ៌នាហាងជាភាសាធម្មតា"
            rows={6}
            disabled={busy}
            submitDisabled={busy}
            leading={
              /* Appended, never replaced: a shop description often takes more than one
                 take, and an owner who records a second note must not lose the first. */
              <VoiceNote
                disabled={busy}
                onTranscript={(text) =>
                  setDescription((current) => (current.trim() ? `${current.trim()} ${text}` : text))
                }
              />
            }
            textareaClassName="km"
          />
          {tooShort && (
            <p role="status" className="km text-xs text-ink">
              ពិពណ៌នាខ្លីពេក។ ប្រាប់សេវាមួយ និងតម្លៃរបស់វា ជាការចាប់ផ្តើម។
            </p>
          )}
          {/* The sample used to write itself into the box on a short submit, so
              pressing the same button twice saved a fictional salon as this
              owner's real catalogue. It is genuinely useful copy, so it stays,
              behind a deliberate tap that says what it is. */}
          <div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDescription(SAMPLE)
                setSampleFilled(true)
                setTooShort(false)
              }}
              disabled={busy}
              className="km min-h-11 rounded-none px-0 text-xs text-rule"
            >
              បំពេញឧទាហរណ៍ហាងកាត់សក់
            </Button>
            {sampleFilled && (
              <p className="km text-xs text-rule">
                នេះជាឧទាហរណ៍ មិនមែនហាងរបស់អ្នកទេ។ កែវាឱ្យត្រូវនឹងហាងរបស់អ្នក មុនចុច &quot;រៀបចំឱ្យខ្ញុំ&quot;។
              </p>
            )}
          </div>
          {state === 'parsing' && (
            <AgentThinking
              steps={parseSteps}
              working
              activeLabel="កំពុងអាន"
              doneLabel="អានរួចរាល់"
            />
          )}
        </>
      )}

      {state === 'error' ? (
        <div role="alert" className="flex items-start gap-3 border border-rule/70 px-3 py-3">
          <CircleAlert className="mt-1 size-4 shrink-0 text-rule" strokeWidth={1.75} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="km text-sm text-ink">{error}</p>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void (parsed ? save() : parse())}
              className="km mt-1 min-h-11 rounded-none px-0"
            >
              សាកម្តងទៀត
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
