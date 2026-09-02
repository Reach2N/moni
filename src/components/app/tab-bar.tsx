'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, X } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet.tsx'
import { cn } from '@/lib/utils.ts'
import { APP_DESTINATIONS, isActive } from './desktop-nav.tsx'
import { PanelCount } from './panel.tsx'

/**
 * The pinned bottom nav on a phone: the same six destinations as the desktop
 * rail, three in the bar and three behind "more", because six Khmer labels do
 * not fit a 360px bar at a readable size and a nav that truncates its own words
 * is worse than a sheet.
 *
 * Active state is the route, from `usePathname`, never local state: the earlier
 * bar tracked anchors inside one page and claimed the owner was on "Moni" the
 * moment the page loaded. The "more" sheet is the installed shadcn Sheet, the
 * same one the header tools already use, so no new component was invented.
 */
const IN_BAR = APP_DESTINATIONS.slice(0, 3)
const IN_SHEET = APP_DESTINATIONS.slice(3)

export function TabBar({ inboxCount }: { inboxCount: number }) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = IN_SHEET.some((item) => isActive(pathname, item.href))

  return (
    <nav
      aria-label="ការធ្វើដំណើររហ័ស"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-rule/70 bg-paper pb-[env(safe-area-inset-bottom)] xl:hidden"
    >
      {IN_BAR.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href)
        const count = href === '/app/inbox' ? inboxCount : 0
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1',
              active ? 'text-ink' : 'text-rule',
            )}
          >
            {active ? <span aria-hidden className="absolute inset-x-4 top-0 h-0.5 bg-seal" /> : null}
            <span className="relative">
              <Icon className="size-5" strokeWidth={active ? 2 : 1.5} aria-hidden />
              {count > 0 ? <PanelCount value={count} className="absolute -top-1 -right-3.5" /> : null}
            </span>
            <span className={cn('km truncate text-xs', active && 'font-semibold')}>{label}</span>
          </Link>
        )
      })}

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-current={moreActive ? 'page' : undefined}
            className={cn(
              'relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1',
              moreActive ? 'text-ink' : 'text-rule',
            )}
          >
            {moreActive ? <span aria-hidden className="absolute inset-x-4 top-0 h-0.5 bg-seal" /> : null}
            <LayoutGrid className="size-5" strokeWidth={moreActive ? 2 : 1.5} aria-hidden />
            <span className={cn('km truncate text-xs', moreActive && 'font-semibold')}>ច្រើនទៀត</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" showCloseButton={false} className="gap-0 bg-paper p-0 shadow-none transition-none">
          <SheetHeader className="flex-row items-start justify-between gap-4 border-b border-hairline px-4 py-3">
            <div className="min-w-0">
              <SheetTitle className="km text-base font-semibold text-ink">ហាងរបស់អ្នក</SheetTitle>
              <SheetDescription className="km mt-0.5 text-sm text-rule">គេហទំព័រ បណ្តាញ និងកន្លែងទទួលប្រាក់</SheetDescription>
            </div>
            <SheetClose asChild>
              <Button type="button" variant="ghost" size="icon-lg" className="size-11 shrink-0 rounded-none" aria-label="បិទ">
                <X aria-hidden />
              </Button>
            </SheetClose>
          </SheetHeader>
          <ul className="divide-y divide-hairline pb-[env(safe-area-inset-bottom)]">
            {IN_SHEET.map(({ href, label, Icon }) => {
              const active = isActive(pathname, href)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={cn('km flex min-h-14 items-center gap-3 px-4 text-base', active ? 'font-semibold text-ink' : 'text-ink')}
                  >
                    <Icon className="size-5 shrink-0 text-rule" strokeWidth={1.75} aria-hidden />
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </nav>
  )
}
