import { BellRing, Bot, CalendarDays, Inbox, Store } from 'lucide-react'
import type { DashboardSnapshot } from '@/lib/queries/dashboard.ts'
import { PanelCount } from './panel.tsx'
import { toKhmerDigits } from './dashboard-format.ts'

/**
 * Desktop navigation. Labelled "ការធ្វើដំណើរក្នុងទំព័រ" rather than "Main":
 * the bottom bar carries the same three destinations, so two landmarks named
 * "Main" left a screen reader user choosing between two identical entries.
 */
export function DesktopNav({ snapshot, urgent }: { snapshot: DashboardSnapshot; urgent: number }) {
  const links = [
    { href: '#needs-now', label: 'ត្រូវពិនិត្យ', Icon: BellRing, count: urgent },
    { href: '#moni', label: 'ប្រាប់ Moni', Icon: Bot, count: 0 },
    { href: '#today', label: 'ថ្ងៃនេះ', Icon: CalendarDays, count: 0 },
    { href: '#inbox', label: 'សារ', Icon: Inbox, count: snapshot.needsOwner.length },
  ]

  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-rule/70 bg-paper xl:flex">
      <div className="flex h-14 items-center gap-2 border-b border-hairline px-5">
        <Store className="size-5 text-rule" strokeWidth={1.75} aria-hidden />
        <p className="text-lg font-semibold tracking-[-0.02em] text-ink">Moni</p>
      </div>
      <nav aria-label="ការធ្វើដំណើរក្នុងទំព័រ" className="p-3">
        {links.map(({ href, label, Icon, count }) => (
          <a
            key={href}
            href={href}
            className="km flex min-h-11 items-center gap-3 border-b border-hairline px-2 text-sm font-semibold text-rule hover:text-ink"
          >
            <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="min-w-0 truncate">{label}</span>
            {count > 0 ? <PanelCount value={count} className="ml-auto" /> : null}
          </a>
        ))}
      </nav>
      <div className="mt-auto border-t border-hairline px-5 py-4">
        <p className="km text-xs text-rule">គម្រោងឥតគិតថ្លៃ</p>
        <p className="km tnum mt-1 text-sm font-semibold text-ink">
          នៅសល់ {toKhmerDigits(snapshot.usage.left)} ការកក់
        </p>
        <p className="km text-xs text-rule">ក្នុងខែនេះ</p>
      </div>
    </aside>
  )
}
