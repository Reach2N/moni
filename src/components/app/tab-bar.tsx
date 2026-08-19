// Searched first: shadcn Tabs is a panel switcher, not a fixed bottom navigation,
// and the 21st.dev sidebar entries are desktop chrome. Hand built, three tabs, in
// the ruled vocabulary.
import { CalendarDays, MessageSquare, MoreHorizontal } from 'lucide-react'
import { toKhmerDigits } from '@/lib/demo.ts'

const TABS = [
  { id: 'today', km: 'ថ្ងៃនេះ', Icon: CalendarDays },
  { id: 'inbox', km: 'សារ', Icon: MessageSquare, badge: 2 },
  { id: 'more', km: 'ផ្សេងទៀត', Icon: MoreHorizontal },
] as const

export function TabBar({ active = 'today' }: { active?: (typeof TABS)[number]['id'] }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-3 border-t border-rule/70 bg-paper pb-[env(safe-area-inset-bottom)]"
    >
      {TABS.map(({ id, km, Icon, ...rest }) => {
        const badge = 'badge' in rest ? rest.badge : undefined
        const isActive = id === active
        return (
          <button
            key={id}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex flex-col items-center gap-1 py-2.5 transition-colors ${
              isActive ? 'text-ink' : 'text-rule hover:text-ink'
            }`}
          >
            {/* active state is a ruled mark, legible without colour */}
            {isActive && <span aria-hidden className="absolute inset-x-6 top-0 h-0.5 bg-seal" />}
            <span className="relative">
              <Icon size={20} strokeWidth={1.5} aria-hidden />
              {badge ? (
                <span className="tnum absolute -top-2 -right-2.5 min-w-[1.125rem] rounded-full bg-seal px-1 text-xs font-semibold leading-[1.125rem] text-paper">
                  {toKhmerDigits(badge)}
                </span>
              ) : null}
            </span>
            <span className="km text-xs">{km}</span>
          </button>
        )
      })}
    </nav>
  )
}
