import { AppShell } from '@/components/app/app-shell.tsx'
import { MoneyAccount } from '@/components/app/money-account.tsx'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'ទទួលប្រាក់' }

/**
 * Where the shop says which account the money goes to. Scope A of the
 * universal app design (docs/superpowers/specs/2026-09-02-universal-app-design.md).
 */
export default async function MoneyPage() {
  const [{ requireMember }, { getPaymentSettings }, { getBusinessById }, { loadShellCounts }] = await Promise.all([
    import('@/lib/auth/member.ts'),
    import('@/lib/payments/account.ts'),
    import('@/lib/queries/business.ts'),
    import('@/lib/queries/shell.ts'),
  ])
  const member = await requireMember()
  const [settings, business, counts] = await Promise.all([
    getPaymentSettings(member.businessId),
    getBusinessById(member.businessId),
    loadShellCounts(member.businessId),
  ])

  return (
    <AppShell shop={{ name: business.name, place: business.province ?? business.address }} inboxCount={counts.inboxCount}>
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
        <h1 className="km text-xl font-semibold text-ink">ទទួលប្រាក់តាម KHQR</h1>
        <p className="km mt-1 text-sm text-rule">
          ប្រាក់ចូលគណនី Bakong របស់អ្នកផ្ទាល់ មិនឆ្លងកាត់ Moni ទេ។ កំណត់ម្តង ហើយ Moni ផ្ញើ QR ឱ្យអតិថិជនគ្រប់ការណាត់។
        </p>
        <div className="mt-6">
          <MoneyAccount settings={settings} />
        </div>
      </div>
    </AppShell>
  )
}
