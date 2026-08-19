'use client'
// Searched first: shadcn Table gives the semantics, so this uses it and adds
// inline editing, per-currency money rendering and the parse warning column,
// none of which exists in either registry.
import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertTriangle, Check, Pencil } from 'lucide-react'
import type { CurrencyCode } from '@/lib/types.ts'
import { moneyKm, toKhmerDigits } from '@/lib/demo.ts'
import type { ParseResponse } from '@/lib/parse-types.ts'

export function ServicesTable({ result }: { result: ParseResponse }) {
  const [rows, setRows] = useState(result.shop.services)
  const [editing, setEditing] = useState<number | null>(null)

  return (
    <section aria-labelledby="services-h" className="border border-rule/70 bg-paper">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline px-4 py-3">
        <h2 id="services-h" className="km text-sm font-semibold tracking-wide text-ink">
          សេវាកម្ម និងតម្លៃ · {toKhmerDigits(rows.length)}
        </h2>
        {/* proof this came from a model call, not a fixture */}
        <p className="tnum text-xs text-rule">
          {result.model} · {result.tokens_in + result.tokens_out} tokens ·{' '}
          {(result.cost_micro_usd / 1_000_000).toFixed(4)} USD
        </p>
      </header>

      {result.warnings.length > 0 && (
        <ul className="border-b border-hairline bg-paper px-4 py-2">
          {result.warnings.map((w) => (
            <li key={w.field} className="flex items-start gap-2 py-0.5 text-xs text-ink">
              <AlertTriangle size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                <span className="font-medium">{w.field}</span> {w.issue}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Table>
        <TableHeader>
          <TableRow className="border-hairline hover:bg-transparent">
            <TableHead className="km h-9 text-xs text-rule">សេវាកម្ម</TableHead>
            <TableHead className="km h-9 text-right text-xs text-rule">តម្លៃ</TableHead>
            <TableHead className="km h-9 text-right text-xs text-rule">រយៈពេល</TableHead>
            <TableHead className="h-9 w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s, i) => (
            <TableRow key={`${s.name}-${i}`} className="border-hairline">
              <TableCell className="km py-2.5 align-top">
                <span className="block font-medium text-ink">{s.name}</span>
                {s.name_en && <span className="block text-xs text-rule">{s.name_en}</span>}
              </TableCell>
              <TableCell className="tnum py-2.5 text-right align-top">
                {editing === i ? (
                  <input
                    autoFocus
                    type="number"
                    value={s.price_minor}
                    onChange={(e) =>
                      setRows((r) =>
                        r.map((row, j) => (j === i ? { ...row, price_minor: Number(e.target.value) } : row)),
                      )
                    }
                    className="tnum w-24 border border-seal bg-paper px-1 py-0.5 text-right outline-none"
                  />
                ) : (
                  <span className="text-ink">
                    {moneyKm(s.price_minor, s.currency as CurrencyCode)}
                  </span>
                )}
              </TableCell>
              <TableCell className="tnum py-2.5 text-right align-top text-rule">
                {toKhmerDigits(s.duration_min)} <span className="km">នាទី</span>
              </TableCell>
              <TableCell className="py-2.5 align-top">
                <button
                  type="button"
                  onClick={() => setEditing(editing === i ? null : i)}
                  aria-label={editing === i ? `Save ${s.name}` : `Edit ${s.name}`}
                  className="p-1 text-rule transition-colors hover:text-ink"
                >
                  {editing === i ? (
                    <Check size={15} strokeWidth={2} aria-hidden />
                  ) : (
                    <Pencil size={14} strokeWidth={1.75} aria-hidden />
                  )}
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="km border-t border-hairline px-4 py-2 text-xs text-rule">
        កែតម្លៃបានផ្ទាល់។ ជំនួយការនឹងប្រើតម្លៃទាំងនេះពេលឆ្លើយអតិថិជន។
      </p>
    </section>
  )
}
