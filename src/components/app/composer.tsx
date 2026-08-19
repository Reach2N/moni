'use client'
// Searched first: no registry has a compose box that streams into a parse result.
// shadcn Textarea is the input primitive underneath; the states around it are the product.
import { useState } from 'react'
import { Loader2, Mic, CornerDownLeft, AlertTriangle } from 'lucide-react'
import type { ParseResponse } from '@/lib/parse-types.ts'

const SAMPLE =
  'កាត់សក់ 15000៛ 30 នាទី។ លាបសក់ 45000៛ ១ម៉ោងកន្លះ។ សក់អ៊ុត 60000៛ ២ម៉ោង។ លាងសក់ 8000៛។ តុបតែងមុខ 25000៛ 45 នាទី។ Open 8am to 7pm, Monday to Saturday. Closed Sunday. Two staff.'

type State = 'idle' | 'parsing' | 'error'

export function Composer({ onParsed }: { onParsed: (r: ParseResponse) => void }) {
  const [text, setText] = useState('')
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)

  const tooShort = text.trim().length < 8

  async function submit() {
    // live and guiding rather than disabled: an empty box fills itself with the
    // example, so the first viewport always has a working primary action.
    if (tooShort) {
      setText(SAMPLE)
      return
    }
    if (state === 'parsing') return
    setState('parsing')
    setError(null)
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'parse failed')
      onParsed(body as ParseResponse)
      setState('idle')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'parse failed')
      setState('error')
    }
  }

  return (
    <section aria-labelledby="composer-h">
      <h2 id="composer-h" className="km text-xl font-semibold text-ink">
        ប្រាប់ពីហាងរបស់អ្នក
      </h2>
      <p className="km mt-1 text-sm text-rule">
        សរសេរជាភាសាធម្មតា។ សេវាកម្ម តម្លៃ និងម៉ោងបើក។ Moni នឹងរៀបចំនៅសល់។
      </p>

      <div className="mt-4 border border-rule/70 bg-paper focus-within:border-seal">
        <label htmlFor="shop" className="sr-only">
          Describe your shop
        </label>
        <textarea
          id="shop"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit()
          }}
          disabled={state === 'parsing'}
          rows={5}
          placeholder="កាត់សក់ 15000៛ 30 នាទី។ Open 8am to 7pm, closed Sunday."
          className="km w-full resize-none bg-transparent px-4 py-3 text-base text-ink outline-none placeholder:text-rule disabled:opacity-60"
        />

        <div className="flex items-center justify-end gap-2 border-t border-hairline px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled
              title="Voice input lands after the demo"
              aria-label="Record voice, not yet available"
              className="p-2 text-rule/50"
            >
              <Mic size={18} strokeWidth={1.5} aria-hidden />
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={state === 'parsing'}
              className="km inline-flex items-center gap-2 bg-ink px-4 py-2 text-sm font-medium text-seal transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {state === 'parsing' ? (
                <Loader2 size={16} strokeWidth={2} className="animate-spin" aria-hidden />
              ) : (
                <CornerDownLeft size={16} strokeWidth={2} aria-hidden />
              )}
              {state === 'parsing' ? 'កំពុងអាន...' : tooShort ? 'បំពេញឧទាហរណ៍' : 'បង្កើតជំនួយការ'}
            </button>
          </div>
        </div>
      </div>

      {state === 'parsing' && (
        <p className="km mt-3 text-sm text-rule" role="status">
          Moni កំពុងអានហាងរបស់អ្នក
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 flex items-start gap-2 border border-rule bg-paper px-3 py-2 text-sm text-ink">
          <AlertTriangle size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            <span className="km font-medium">អានមិនបាន។</span> {error}
          </span>
        </p>
      )}
    </section>
  )
}
