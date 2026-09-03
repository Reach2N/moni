'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Minus, Plus, ShoppingBag } from 'lucide-react'
import { formatMoney, type CurrencyCode } from '@/lib/types.ts'
import { toKhmerDigits } from '@/lib/format/khmer.ts'

/**
 * The counter on a shop's own site.
 *
 * Products only. `createOrder` decrements the `products` table and prices from
 * its rows, a service has neither a product row nor stock, and a haircut needs
 * a time rather than a basket. So services keep the existing book-or-contact
 * action above and neither pretends to be the other.
 *
 * Per CLAUDE.md rule 9 this holds no business logic. It holds quantities,
 * renders a running total from prices the server already put in the page, and
 * POSTs product ids and quantities. The AUTHORITATIVE total is the one
 * `createOrder` computes inside the transaction from the catalogue: the figure
 * below is a courtesy, and a stale page cannot commit an old price because the
 * price is never on the wire.
 *
 * Component sourcing: no cart, basket or quantity stepper exists in Beautiful
 * UI's set, in the installed shadcn primitives, or anywhere else already in this
 * repo (searched 3 September 2026). This is the recorded gap.
 *
 * No saved cart. Component state only: a customer who reloads mid-basket starts
 * again, which for a four-item coffee order is acceptable and a persisted one is
 * its own piece of work.
 */
export type CartItem = {
  id: string
  name: string
  nameEn: string | null
  priceMinor: number
  currency: CurrencyCode
}

type Placed = { code: string }

export function Cart({ slug, items }: { slug: string; items: CartItem[] }) {
  const router = useRouter()
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [placed, setPlaced] = useState<Placed | null>(null)

  const currency = items[0]?.currency ?? 'KHR'
  const chosen = useMemo(
    () => items.filter((item) => (quantities[item.id] ?? 0) > 0),
    [items, quantities],
  )
  const runningTotal = chosen.reduce(
    (sum, item) => sum + item.priceMinor * (quantities[item.id] ?? 0),
    0,
  )

  function step(id: string, by: number) {
    setQuantities((current) => {
      const next = Math.min(99, Math.max(0, (current[id] ?? 0) + by))
      return { ...current, [id]: next }
    })
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (sending || chosen.length === 0) return
    setSending(true)
    setError(null)
    try {
      const response = await fetch(`/api/shop/${slug}/order`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          lines: chosen.map((item) => ({ product_id: item.id, quantity: quantities[item.id] })),
          customer_name: name.trim(),
          customer_phone: phone.trim() || null,
          note: note.trim() || null,
        }),
      })
      const body = (await response.json()) as { code?: string; error?: string }
      if (!response.ok || !body.code) {
        // The route already answers in Khmer for every OrderError code, so the
        // sentence a customer reads is the one the server chose.
        setError(body.error ?? 'ការបញ្ជាទិញនេះមិនបានសម្រេចទេ។ សូមព្យាយាមម្ដងទៀត។')
        return
      }
      setPlaced({ code: body.code })
      // The order page is the shareable, reloadable address for this order, and
      // landing on it is the point. It is `force-dynamic`, so a push renders it
      // fresh rather than serving a cached shell with no status on it.
      router.push(`/s/${slug}/order/${body.code}`)
    } catch {
      setError('មិនអាចភ្ជាប់បានទេ។ សូមពិនិត្យអ៊ីនធឺណិត រួចព្យាយាមម្ដងទៀត។')
    } finally {
      setSending(false)
    }
  }

  if (items.length === 0) return null

  return (
    <section className="border-t border-separator px-5 py-10">
      <h2 className="km flex items-center gap-2 text-sm font-semibold tracking-wide text-label-2">
        <ShoppingBag aria-hidden className="size-4" />
        បញ្ជាទិញ
      </h2>

      <form onSubmit={submit} className="mt-3">
        <ul>
          {items.map((item) => {
            const quantity = quantities[item.id] ?? 0
            return (
              <li key={item.id} className="sf-row flex items-center gap-3">
                <span className="km min-w-0 flex-1">
                  <span className="block truncate">{item.name}</span>
                  {item.nameEn ? (
                    <span className="block truncate text-xs text-label-2">{item.nameEn}</span>
                  ) : null}
                </span>
                <span className="tnum shrink-0 text-sm text-label-2">
                  {formatMoney(item.priceMinor, item.currency)}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => step(item.id, -1)}
                    disabled={quantity === 0}
                    aria-label={`ដក ${item.name}`}
                    className="inline-flex size-9 items-center justify-center rounded-[calc(var(--sf-radius)*0.6)] border border-separator disabled:opacity-40"
                  >
                    <Minus aria-hidden className="size-4" />
                  </button>
                  {/* Transliterated, never formatted through a km-KH locale:
                      Node and Chrome disagree on that locale's separators. */}
                  <span className="tnum w-7 text-center text-sm">{toKhmerDigits(quantity)}</span>
                  <button
                    type="button"
                    onClick={() => step(item.id, 1)}
                    aria-label={`បន្ថែម ${item.name}`}
                    className="inline-flex size-9 items-center justify-center rounded-[calc(var(--sf-radius)*0.6)] border border-separator"
                  >
                    <Plus aria-hidden className="size-4" />
                  </button>
                </span>
              </li>
            )
          })}
        </ul>

        <p className="km mt-4 flex items-baseline justify-between border-t border-separator pt-4 font-semibold">
          <span>សរុប</span>
          <span className="tnum">{formatMoney(runningTotal, currency)}</span>
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <label className="km flex flex-col gap-1 text-sm">
            ឈ្មោះរបស់អ្នក
            <input
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="km min-h-11 rounded-[calc(var(--sf-radius)*0.6)] border border-separator bg-surface px-3"
            />
          </label>
          <label className="km flex flex-col gap-1 text-sm">
            លេខទូរស័ព្ទ (មិនចាំបាច់)
            <input
              type="tel"
              maxLength={30}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="km min-h-11 rounded-[calc(var(--sf-radius)*0.6)] border border-separator bg-surface px-3"
            />
          </label>
          <label className="km flex flex-col gap-1 text-sm">
            សម្គាល់ (មិនចាំបាច់)
            <input
              maxLength={300}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="km min-h-11 rounded-[calc(var(--sf-radius)*0.6)] border border-separator bg-surface px-3"
            />
          </label>
        </div>

        {error ? (
          <p className="km mt-4 rounded-[var(--sf-radius)] border border-separator p-3 text-sm">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={sending || chosen.length === 0 || name.trim().length === 0}
          className="km mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--sf-radius)] bg-green px-6 text-[0.9375rem] font-medium text-on-green disabled:opacity-40"
        >
          {sending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
          {placed ? 'កំពុងបើកទំព័របង់ប្រាក់' : 'បញ្ជាទិញ និងបង់ប្រាក់'}
        </button>
      </form>
    </section>
  )
}
