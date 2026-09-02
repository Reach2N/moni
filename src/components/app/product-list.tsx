'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CircleAlert, LoaderCircle, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { formatMoney, type CatalogItem, type CurrencyCode, type Sells } from '@/lib/types.ts'
import { toKhmerDigits } from './dashboard-format.ts'
import { ProductPhoto } from './product-photo.tsx'

/**
 * What the shop sells, both kinds, on one screen.
 *
 * Component sourcing, searched in order before this was written. Beautiful UI
 * has no catalogue or product component. The vendored
 * `src/components/primitives/RecordsTable.tsx` was checked and does not fit: its
 * columns are a closed union of CRM fields, its row type is fixed, and it has no
 * image cell at all, so using it would mean rewriting its column model, which
 * the sourcing rule calls substantially rewriting a library component. CREDITS.md
 * already records it being rejected once before for the same class of reason.
 * What is left is the app's own documented grammar: the hairline-divided list
 * used by the inbox, composed from installed shadcn Input and Button. The gap is
 * reported in CREDITS.md rather than papered over.
 *
 * No business logic here. It takes rows and calls the HTTP contracts.
 */
type Row = CatalogItem & { photo_url: string | null }

function money(item: CatalogItem) {
  return toKhmerDigits(formatMoney(item.price_minor, item.currency as CurrencyCode))
}

export function ProductList({ items, leadWith }: { items: Row[]; leadWith: Sells }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', price: '', category: '' })
  const [, startTransition] = useTransition()

  // Filtering is client side because the whole catalogue is already loaded: a
  // shop has under fifty items, so a round trip per keystroke would be slower
  // and no more correct.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return items
    return items.filter((item) => item.name.toLowerCase().includes(term) || (item.category ?? '').toLowerCase().includes(term))
  }, [items, search])

  // A cafe sees its menu first, a salon sees its services first. Nothing is
  // hidden either way: an owner who sells both needs both.
  const order: CatalogItem['kind'][] = leadWith === 'time' ? ['service', 'product'] : ['product', 'service']
  const groups = order
    .map((kind) => ({ kind, rows: filtered.filter((item) => item.kind === kind) }))
    .filter((group) => group.rows.length > 0)

  async function add() {
    const name = draft.name.trim()
    const price = Number(draft.price)
    if (!name || !Number.isFinite(price) || price < 0) {
      setError('ត្រូវការឈ្មោះ និងតម្លៃជាលេខ។')
      return
    }
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          // Minor units, whole numbers only. Riel has no decimals, so what the
          // owner types IS the minor amount.
          price_minor: Math.round(price),
          category: draft.category.trim() || null,
        }),
      })
      const body = await response.json()
      if (!response.ok || body.error) throw new Error(body.error ?? 'that could not be saved')
      setDraft({ name: '', price: '', category: '' })
      setAdding(false)
      startTransition(() => router.refresh())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'that could not be saved')
    } finally {
      setBusy(false)
    }
  }

  async function archive(id: string, name: string) {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      const body = await response.json()
      if (!response.ok || body.error) throw new Error(body.error ?? 'that could not be removed')
      startTransition(() => router.refresh())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${name} could not be removed`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">ស្វែងរក</span>
          <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-rule" strokeWidth={1.75} aria-hidden />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ស្វែងរកតាមឈ្មោះ"
            className="km min-h-11 rounded-none border-rule/70 bg-paper pl-8 text-base shadow-none"
          />
        </label>
        <Button type="button" onClick={() => setAdding((open) => !open)} className="km min-h-11 rounded-none">
          <Plus data-icon="inline-start" aria-hidden />
          បន្ថែមមុខទំនិញ
        </Button>
      </div>

      {adding ? (
        <form
          className="flex flex-col gap-3 border border-rule/70 px-3 py-3"
          onSubmit={(event) => {
            event.preventDefault()
            void add()
          }}
        >
          <label className="km text-xs font-semibold text-rule">
            ឈ្មោះ
            <Input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="កាហ្វេទឹកកក"
              required
              className="km mt-1 min-h-11 rounded-none border-rule/70 bg-paper text-base shadow-none"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="km text-xs font-semibold text-rule">
              តម្លៃ
              <Input
                value={draft.price}
                onChange={(event) => setDraft({ ...draft, price: event.target.value })}
                inputMode="numeric"
                placeholder="5000"
                required
                className="tnum mt-1 min-h-11 rounded-none border-rule/70 bg-paper text-base shadow-none"
              />
            </label>
            <label className="km text-xs font-semibold text-rule">
              ក្រុមក្នុងម៉ឺនុយ
              <Input
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                placeholder="ភេសជ្ជៈ"
                className="km mt-1 min-h-11 rounded-none border-rule/70 bg-paper text-base shadow-none"
              />
            </label>
          </div>
          <div>
            <Button type="submit" disabled={busy} className="km min-h-11 rounded-none">
              {busy ? <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden /> : <Plus data-icon="inline-start" aria-hidden />}
              រក្សាទុក
            </Button>
          </div>
        </form>
      ) : null}

      {error ? (
        <p className="km flex items-start gap-2 text-sm text-ink" role="alert">
          <CircleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          {error}
        </p>
      ) : null}

      {groups.length === 0 ? (
        <p className="km border border-rule/70 px-3 py-6 text-center text-sm text-rule">
          {items.length === 0
            ? 'មិនទាន់មានអ្វីលក់ទេ។ បន្ថែមមុខទំនិញដំបូង ឬប្រាប់ Moni ថា «បន្ថែមម៉ឺនុយ…»។'
            : 'រកមិនឃើញអ្វីត្រូវនឹងការស្វែងរកនេះទេ។'}
        </p>
      ) : null}

      {groups.map((group) => (
        <section key={group.kind} className="border border-rule/70">
          <header className="border-b border-hairline px-3 py-2">
            <h2 className="km text-sm font-semibold text-ink">
              {group.kind === 'product' ? 'មុខទំនិញ' : 'សេវា'}
            </h2>
            <p className="km text-xs text-rule">
              {group.kind === 'product'
                ? 'អ្វីដែលអ្នកប្រគល់ឱ្យអតិថិជនភ្លាម។ រូបភាពបង្ហាញនៅលើគេហទំព័រហាង។'
                : 'ការងារដែលកក់ម៉ោង។ កែនៅផ្ទាំងរៀបចំហាង។'}
            </p>
          </header>

          <ul className="divide-y divide-hairline">
            {group.rows.map((item) => (
              <li key={item.id} className="flex flex-wrap items-start gap-3 px-3 py-3">
                {item.kind === 'product' ? (
                  <ProductPhoto productId={item.id} photoUrl={item.photo_url} name={item.name} />
                ) : null}

                <div className="min-w-0 flex-1">
                  <p className="km text-sm font-semibold text-ink">{item.name}</p>
                  <p className="km tnum mt-0.5 text-sm text-rule">
                    {money(item)}
                    {item.category ? ` · ${item.category}` : ''}
                    {/* Null stock means uncounted, which is not zero: say nothing rather than imply none left. */}
                    {item.stock != null ? ` · នៅសល់ ${toKhmerDigits(item.stock)}` : ''}
                    {!item.active ? ' · មិនប្រើ' : ''}
                  </p>
                </div>

                {item.kind === 'product' && item.active ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void archive(item.id, item.name)}
                    className="km min-h-11 rounded-none text-sm"
                  >
                    ដកចេញ
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
