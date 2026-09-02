'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CircleAlert, LoaderCircle, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { candidateSeeds, styleFor } from '@/lib/storefront/style.ts'
import type { Vibe, ThemeId } from '@/lib/types.ts'

/**
 * Four looks, side by side, and she taps one.
 *
 * `styleFor` is pure and the content is already on the page, so four candidates
 * cost one render and no model call. That is the whole reason this is a picker
 * and not a reroll button: comparing beats rolling blind, and it is free.
 *
 * Rerolling changes the seed and never the vibe, so a warm shop stays warm and
 * only becomes a different warm.
 */
export function SeedPicker({
  seed,
  vibe,
  theme,
  headline,
}: {
  seed: number
  vibe: Vibe
  theme: ThemeId
  headline: string
}) {
  const router = useRouter()
  const [shuffleFrom, setShuffleFrom] = useState(seed)
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState('')
  // candidateSeeds excludes shuffleFrom, not seed: after a reroll those two
  // differ, so a rolled candidate can collide with the seed already chosen.
  // Ask for one extra and drop it, so a collision still leaves three real
  // alternates rather than shipping four tiles where two both read as chosen.
  const candidates = [seed, ...candidateSeeds(shuffleFrom, 4).filter((candidate) => candidate !== seed).slice(0, 3)]

  async function choose(next: number) {
    setBusy(next)
    setError('')
    try {
      const response = await fetch('/api/storefront/seed', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ seed: next }),
      })
      const body = await response.json()
      if (!response.ok || body.error) throw new Error(body.error ?? 'request failed')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'that look could not be saved')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="km text-sm font-semibold text-ink">រូបរាងហាង</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy !== null}
          onClick={() => setShuffleFrom(candidates[1] ?? seed)}
          className="km min-h-11 rounded-none"
        >
          <Shuffle data-icon="inline-start" aria-hidden />
          ប្តូរ
        </Button>
      </div>
      <p className="km mt-1 text-xs text-rule">ជ្រើសរើសមួយ។ ពាក្យនៅដដែល ប្តូរតែពណ៌ និងរូបរាង។</p>

      <ul role="radiogroup" aria-label="រូបរាងហាង" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {candidates.map((candidate) => {
          const style = styleFor(candidate, vibe, theme)
          const chosen = candidate === seed
          return (
            <li key={candidate} role="presentation">
              <button
                type="button"
                role="radio"
                onClick={() => choose(candidate)}
                disabled={busy !== null}
                aria-checked={chosen}
                className="w-full overflow-hidden border border-rule/70 text-left disabled:opacity-60 aria-checked:border-seal/70 aria-checked:ring-2 aria-checked:ring-seal/40"
                style={style.vars as CSSProperties}
              >
                <span className="block aspect-[4/5] p-3" style={{ background: 'var(--sf-surface)' }}>
                  <span
                    className="km block truncate text-[11px] font-semibold"
                    style={{ fontWeight: 'var(--sf-weight-heading)' }}
                  >
                    {headline}
                  </span>
                  <span className="mt-2 block h-1.5 w-3/4 rounded-full" style={{ background: 'var(--sf-accent-tint)' }} />
                  <span className="mt-1 block h-1.5 w-1/2 rounded-full" style={{ background: 'var(--sf-accent-tint)' }} />
                  <span
                    className="mt-3 block h-6 w-full"
                    style={{ background: 'var(--sf-accent)', borderRadius: 'var(--sf-radius)' }}
                  />
                </span>
                <span className="flex min-h-9 items-center justify-center gap-1 border-t border-hairline bg-paper px-2 text-xs">
                  {busy === candidate ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : null}
                  {chosen && busy === null ? <Check className="size-3.5" aria-hidden /> : null}
                  <span className="km">{chosen ? 'កំពុងប្រើ' : 'ជ្រើស'}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {error ? (
        <p role="alert" className="km mt-2 flex items-start gap-2 text-xs text-rule">
          <CircleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          {error}
        </p>
      ) : null}
    </section>
  )
}
