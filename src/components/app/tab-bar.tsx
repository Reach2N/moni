'use client'

import { useEffect, useState } from 'react'
import { BellRing, Bot, CalendarDays, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils.ts'
import { PanelCount } from './panel.tsx'

const TABS = [
  { id: 'needs-now', label: 'ត្រូវធ្វើ', Icon: BellRing },
  { id: 'moni', label: 'Moni', Icon: Bot },
  { id: 'today', label: 'ថ្ងៃនេះ', Icon: CalendarDays },
  { id: 'inbox', label: 'សារ', Icon: Inbox },
] as const

/**
 * The pinned bottom nav.
 *
 * The active tab used to be local state set on click, so it claimed the owner was
 * on "Moni" the moment the page loaded and stayed wrong for the whole session
 * once she scrolled by hand. These are anchors into one document, so the honest
 * source of truth is which section is actually on screen, and `aria-current` now
 * says the same thing the seal bar says.
 */
export function TabBar({ inboxCount, urgent }: { inboxCount: number; urgent: number }) {
  const [active, setActive] = useState<(typeof TABS)[number]['id']>('needs-now')

  useEffect(() => {
    const sections = TABS.map((tab) => document.getElementById(tab.id)).filter(
      (element): element is HTMLElement => element !== null,
    )
    if (sections.length === 0) return

    // The top third of the viewport is what the reader is actually looking at:
    // a section that has only just entered from the bottom has not been read yet.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length === 0) return
        const top = visible.toSorted((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (top) setActive(top.target.id as (typeof TABS)[number]['id'])
      },
      { rootMargin: '-56px 0px -66% 0px', threshold: 0 },
    )
    for (const section of sections) observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <nav
      aria-label="ការធ្វើដំណើររហ័ស"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-rule/70 bg-paper pb-[env(safe-area-inset-bottom)] xl:hidden"
    >
      {TABS.map(({ id, label, Icon }) => {
        const count = id === 'inbox' ? inboxCount : id === 'needs-now' ? urgent : 0
        return (
          <a
            key={id}
            href={`#${id}`}
            onClick={() => setActive(id)}
            aria-current={id === active ? 'true' : undefined}
            className={cn(
              'relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1',
              id === active ? 'text-ink' : 'text-rule',
            )}
          >
            {id === active ? <span aria-hidden className="absolute inset-x-4 top-0 h-0.5 bg-seal" /> : null}
            <span className="relative">
              <Icon className="size-5" strokeWidth={id === active ? 2 : 1.5} aria-hidden />
              {count > 0 ? <PanelCount value={count} className="absolute -top-1 -right-3.5" /> : null}
            </span>
            <span className={cn('km truncate text-xs', id === active && 'font-semibold')}>{label}</span>
          </a>
        )
      })}
    </nav>
  )
}
