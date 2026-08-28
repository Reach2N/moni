'use client'

import { useState } from 'react'
import { ArrowLeft, Check, CircleAlert, LoaderCircle, Save, WandSparkles } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'
import type { ParseResponse } from '@/lib/parse-types.ts'
import { moneyKm, toKhmerDigits } from './dashboard-format.ts'

const SAMPLE =
  'កាត់សក់ 15000៛ 30 នាទី។ លាបសក់ 45000៛ ១ម៉ោងកន្លះ។ សក់អ៊ុត 60000៛ ២ម៉ោង។ លាងសក់ 8000៛។ Open 8am to 7pm, Monday to Saturday. Closed Sunday. Two staff.'

type SetupState = 'describe' | 'parsing' | 'review' | 'saving' | 'saved' | 'error'

export function ShopSetup({ onSaved }: { onSaved: () => void }) {
  const [description, setDescription] = useState('')
  const [parsed, setParsed] = useState<ParseResponse | null>(null)
  const [state, setState] = useState<SetupState>('describe')
  const [error, setError] = useState('')

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
      setDescription(SAMPLE)
      return
    }
    setParsed(null)
    setState('parsing')
    setError('')
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: description }),
      })
      const body = await response.json()
      if (!response.ok || body.error) throw new Error(body.error ?? 'parse failed')
      setParsed(body as ParseResponse)
      setState('review')
    } catch {
      setError('Moni មិនអាចអានព័ត៌មានហាងបាន។ ទិន្នន័យហាងមិនបានប្តូរទេ។')
      setState('error')
    }
  }

  async function save() {
    if (!parsed) return
    setState('saving')
    setError('')
    const payload = {
      raw_description: description,
      model: parsed.model,
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

  return (
    <div className="flex flex-col gap-4 px-4 pb-8" aria-live="polite" aria-busy={busy}>
      {state === 'review' || state === 'saving' || state === 'saved' ? (
        <>
          <div className="flex items-center justify-between gap-3 border-y border-hairline py-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setParsed(null)
                setError('')
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
            <ul>
              {parsed?.shop.services.map((service, index) => (
                <li key={`service-${index}`} className="border-t border-hairline px-3 py-3 first:border-t-0">
                  <label className="km block text-xs font-semibold text-rule" htmlFor={`service-name-${index}`}>
                    ឈ្មោះសេវា
                  </label>
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
                </li>
              ))}
            </ul>
          </div>

          {parsed && parsed.warnings.length > 0 ? (
            <div className="border border-rule/70 px-3 py-2">
              <p className="km text-sm font-semibold text-ink">មានព័ត៌មានត្រូវពិនិត្យ</p>
              {parsed.warnings.map((warning) => (
                <p key={`${warning.field}-${warning.issue}`} className="mt-1 text-xs text-rule">{warning.issue}</p>
              ))}
            </div>
          ) : null}

          {state === 'saved' ? (
            <div className="flex items-start gap-3 border border-rule/70 px-3 py-3">
              <Check className="mt-1 size-5 shrink-0 text-seal-text" strokeWidth={1.75} aria-hidden />
              <div>
                <p className="km text-sm font-semibold text-ink">បានរក្សាទុកការរៀបចំហាង</p>
                <p className="km mt-1 text-sm text-rule">ផែនការហាងបានធ្វើបច្ចុប្បន្នភាពពីទិន្នន័យថ្មី។</p>
              </div>
            </div>
          ) : (
            <Button type="button" onClick={() => void save()} disabled={busy} className="km min-h-11 w-full rounded-none">
              {state === 'saving' ? <LoaderCircle data-icon="inline-start" aria-hidden /> : <Save data-icon="inline-start" aria-hidden />}
              {state === 'saving' ? 'កំពុងរក្សាទុកការរៀបចំហាង' : 'រក្សាទុកក្នុងហាង'}
            </Button>
          )}
        </>
      ) : (
        <>
          <div>
            <label htmlFor="shop-description" className="km text-sm font-semibold text-ink">ពិពណ៌នាហាងជាភាសាធម្មតា</label>
            <p className="km mt-1 text-sm text-rule">ប្រាប់សេវា តម្លៃ ម៉ោងបើក និងចំនួនបុគ្គលិក ឬបន្ទប់។</p>
          </div>
          <Textarea
            id="shop-description"
            name="shop-description"
            autoComplete="off"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={busy}
            rows={7}
            placeholder="កាត់សក់ 15000៛ 30 នាទី។ បើកពីម៉ោង 8 ព្រឹក ដល់ 7 យប់…"
            className="km min-h-44 resize-none rounded-none border-rule/70 bg-paper text-base shadow-none placeholder:text-rule md:text-base"
          />
          <Button type="button" onClick={() => void parse()} disabled={busy} className="km min-h-11 w-full rounded-none">
            {state === 'parsing' ? <LoaderCircle data-icon="inline-start" aria-hidden /> : <WandSparkles data-icon="inline-start" aria-hidden />}
            {state === 'parsing' ? 'Moni កំពុងរៀបចំសេវា និងម៉ោងបើក' : description.trim().length < 8 ? 'បំពេញឧទាហរណ៍' : 'រៀបចំឱ្យខ្ញុំពិនិត្យ'}
          </Button>
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
