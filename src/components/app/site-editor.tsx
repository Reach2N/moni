'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CircleAlert, Check, ExternalLink, LoaderCircle, Send, WandSparkles } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'
import { THEMES, type StorefrontContent } from '@/lib/types.ts'

type Warning = { field: string; issue: string }

/**
 * The owner's control over their own public site.
 *
 * Moni writes a draft, the owner reads it, edits any line, and publishes. The
 * publish button is the only thing that changes what a customer sees, which is
 * the whole safety story for generated sites: the model fills validated strings,
 * a person decides.
 */
export function SiteEditor({
  slug,
  initialDraft,
  hasPublished,
  publishedAt,
}: {
  slug: string
  initialDraft: StorefrontContent | null
  hasPublished: boolean
  publishedAt: string | null
}) {
  const router = useRouter()
  const [draft, setDraft] = useState<StorefrontContent | null>(initialDraft)
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [busy, setBusy] = useState<'generate' | 'save' | 'publish' | null>(null)
  const [error, setError] = useState('')
  const [published, setPublished] = useState(hasPublished)

  async function call(action: 'generate' | 'save' | 'publish') {
    setBusy(action)
    setError('')
    try {
      const response = await fetch('/api/storefront', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(action === 'save' ? { action, content: draft } : { action }),
      })
      const body = await response.json()
      if (!response.ok || body.error) throw new Error(body.error ?? 'request failed')
      if (body.storefront?.draft) setDraft(body.storefront.draft as StorefrontContent)
      if (body.storefront?.published) setPublished(true)
      setWarnings((body.warnings as Warning[]) ?? [])
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'that did not work')
    } finally {
      setBusy(null)
    }
  }

  function edit<K extends keyof StorefrontContent>(field: K, value: StorefrontContent[K]) {
    setDraft((current) => (current ? { ...current, [field]: value } : current))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => void call('generate')} disabled={busy !== null} className="km min-h-11 rounded-none">
          {busy === 'generate' ? <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden /> : <WandSparkles data-icon="inline-start" aria-hidden />}
          {draft ? 'សរសេរឡើងវិញ' : 'ឱ្យ Moni សរសេរគេហទំព័រ'}
        </Button>
        {published ? (
          <a
            href={`/s/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="km inline-flex min-h-11 items-center gap-2 text-sm text-ink underline underline-offset-4"
          >
            មើលគេហទំព័រ
            <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden />
          </a>
        ) : null}
      </div>

      {published ? (
        <p className="km flex items-center gap-2 text-xs text-seal-text">
          <Check className="size-3.5" strokeWidth={1.75} aria-hidden />
          បានផ្សាយ{publishedAt ? ` · ${new Date(publishedAt).toLocaleDateString('en-GB')}` : ''}
        </p>
      ) : (
        <p className="km text-xs text-rule">មិនទាន់ផ្សាយទេ។ គ្មាននរណាមើលឃើញរហូតដល់អ្នកចុចផ្សាយ។</p>
      )}

      {draft ? (
        <div className="border border-rule/70">
          <header className="border-b border-hairline px-3 py-2">
            <h2 className="km text-sm font-semibold text-ink">អត្ថបទលើគេហទំព័រ</h2>
            <p className="km text-xs text-rule">កែបានគ្រប់បន្ទាត់។ តម្លៃមកពីបញ្ជីសេវារបស់អ្នក មិនមែនពីអត្ថបទនេះទេ។</p>
          </header>

          <div className="flex flex-col gap-3 px-3 py-3">
            <label className="km text-xs font-semibold text-rule">
              រូបរាង
              <select
                value={draft.theme}
                onChange={(event) => edit('theme', event.target.value as StorefrontContent['theme'])}
                className="km mt-1 block min-h-11 w-full rounded-none border border-rule/70 bg-paper px-2 text-base"
              >
                {THEMES.map((theme) => (
                  <option key={theme.id} value={theme.id}>{theme.name} · {theme.note}</option>
                ))}
              </select>
            </label>

            <label className="km text-xs font-semibold text-rule">
              ចំណងជើង
              <Input
                value={draft.headline}
                maxLength={70}
                onChange={(event) => edit('headline', event.target.value)}
                className="km mt-1 min-h-11 rounded-none border-rule/70 bg-paper text-base shadow-none md:text-base"
              />
            </label>

            <label className="km text-xs font-semibold text-rule">
              បន្ទាត់ពន្យល់
              <Input
                value={draft.subhead}
                maxLength={160}
                onChange={(event) => edit('subhead', event.target.value)}
                className="km mt-1 min-h-11 rounded-none border-rule/70 bg-paper text-base shadow-none md:text-base"
              />
            </label>

            <label className="km text-xs font-semibold text-rule">
              អំពីហាង
              <Textarea
                value={draft.about}
                maxLength={600}
                rows={4}
                onChange={(event) => edit('about', event.target.value)}
                className="km mt-1 resize-none rounded-none border-rule/70 bg-paper text-base shadow-none md:text-base"
              />
            </label>

            <label className="km text-xs font-semibold text-rule">
              អក្សរលើប៊ូតុង
              <Input
                value={draft.callToAction}
                maxLength={40}
                onChange={(event) => edit('callToAction', event.target.value)}
                className="km mt-1 min-h-11 rounded-none border-rule/70 bg-paper text-base shadow-none md:text-base"
              />
            </label>

            <fieldset className="km text-xs font-semibold text-rule">
              <legend>ចំណុចសំខាន់</legend>
              {draft.highlights.map((line, index) => (
                <Input
                  key={index}
                  value={line}
                  maxLength={90}
                  onChange={(event) =>
                    edit('highlights', draft.highlights.map((current, i) => (i === index ? event.target.value : current)))
                  }
                  className="km mt-1 min-h-11 rounded-none border-rule/70 bg-paper text-base shadow-none md:text-base"
                />
              ))}
            </fieldset>
          </div>

          {warnings.length > 0 ? (
            <div className="border-t border-hairline px-3 py-2">
              <p className="km text-xs font-semibold text-ink">សូមពិនិត្យមុនផ្សាយ</p>
              {warnings.map((warning) => (
                <p key={`${warning.field}-${warning.issue}`} className="km mt-1 text-xs text-rule">
                  {warning.field}៖ {warning.issue}
                </p>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t border-hairline px-3 py-3">
            <Button type="button" variant="outline" onClick={() => void call('save')} disabled={busy !== null} className="km min-h-11 rounded-none">
              រក្សាទុកសេចក្តីព្រាង
            </Button>
            <Button type="button" onClick={() => void call('publish')} disabled={busy !== null} className="km min-h-11 rounded-none">
              {busy === 'publish' ? <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden /> : <Send data-icon="inline-start" aria-hidden />}
              ផ្សាយ
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="km flex items-start gap-2 text-xs text-rule">
          <CircleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  )
}
