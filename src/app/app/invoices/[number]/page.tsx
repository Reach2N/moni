import { notFound } from 'next/navigation'
import { formatMoney, invoiceLabel, type CurrencyCode } from '@/lib/types.ts'

export const dynamic = 'force-dynamic'

/**
 * An invoice is a Next route with a print stylesheet, not a PDF library.
 *
 * The browser already has a typesetting engine and a PDF writer, and shipping a
 * PDF library into a serverless bundle to reproduce them badly is how a 3MB
 * dependency ends up on the critical path of a shop printing a receipt.
 * Cmd+P gives a real PDF with real Khmer shaping, which is the part a
 * server-side PDF library usually gets wrong.
 */
export default async function InvoicePage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params
  const parsed = Number(number)
  if (!Number.isInteger(parsed) || parsed < 1) notFound()

  const [{ requireMember }, { getInvoice }] = await Promise.all([
    import('@/lib/auth/member.ts'),
    import('@/lib/queries/invoices.ts'),
  ])
  const member = await requireMember()
  const invoice = await getInvoice(member.businessId, parsed)
  if (!invoice) notFound()

  const currency = invoice.currency as CurrencyCode

  return (
    <main className="mx-auto w-full max-w-2xl bg-white px-6 py-10 text-[#1D1D1F] print:max-w-none print:px-0 print:py-0">
      <style>{`
        @media print {
          /* The dashboard chrome is not part of the document being printed. */
          nav, .no-print { display: none !important; }
          @page { margin: 16mm; }
        }
      `}</style>

      <header className="flex items-start justify-between gap-6 border-b border-[#3C3C4349] pb-4">
        <div>
          <h1 className="km text-lg font-semibold">{invoice.businessName}</h1>
          {invoice.businessAddress ? <p className="km text-sm text-[#3C3C4399]">{invoice.businessAddress}</p> : null}
          {invoice.businessPhone ? <p className="tnum text-sm text-[#3C3C4399]">{invoice.businessPhone}</p> : null}
        </div>
        <div className="text-right">
          <p className="km text-xs uppercase tracking-wide text-[#3C3C4399]">វិក្កយបត្រ</p>
          <p className="tnum text-lg font-semibold">{invoiceLabel(invoice.businessSlug, invoice.number)}</p>
          <p className="tnum text-sm text-[#3C3C4399]">
            {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Asia/Phnom_Penh' }).format(
              new Date(invoice.issuedAt),
            )}
          </p>
        </div>
      </header>

      {invoice.customerName ? (
        <p className="km mt-4 text-sm">
          <span className="text-[#3C3C4399]">អតិថិជន៖ </span>
          {invoice.customerName}
        </p>
      ) : null}

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[#3C3C4349] text-left">
            <th className="km py-2 font-medium">មុខទំនិញ</th>
            <th className="km py-2 text-right font-medium">ចំនួន</th>
            <th className="km py-2 text-right font-medium">តម្លៃ</th>
            <th className="km py-2 text-right font-medium">សរុប</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line) => (
            <tr key={line.id} className="border-b border-[#3C3C431F]">
              <td className="km py-2">{line.name}</td>
              <td className="tnum py-2 text-right">{line.quantity}</td>
              <td className="tnum py-2 text-right">{formatMoney(line.unitPriceMinor, currency)}</td>
              <td className="tnum py-2 text-right">{formatMoney(line.lineTotalMinor, currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="km py-3 text-right font-semibold">សរុបទាំងអស់</td>
            {/* Through formatMoney(), like every other amount in this product.
                An invoice is the one place a rounding difference becomes a
                dispute rather than a display bug. */}
            <td className="tnum py-3 text-right font-semibold">{formatMoney(invoice.totalMinor, currency)}</td>
          </tr>
        </tfoot>
      </table>

      <p className="km mt-8 text-xs text-[#3C3C4399]">
        សូមអរគុណ។ វិក្កយបត្រនេះចេញដោយស្វ័យប្រវត្តិតាមរយៈ Moni។
      </p>
    </main>
  )
}
