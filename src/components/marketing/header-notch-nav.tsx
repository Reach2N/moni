'use client'

/**
 * The header, which is one notch and nothing else.
 *
 * This is the adaptive notch navigation bar actually mounted. CREDITS.md
 * records why the source component's own `NotchNav` shell is not used: it is
 * `fixed inset-0 h-screen w-screen` and owns a nested scroll viewport, so the
 * page would scroll inside it and every GSAP window-scroll scene on this page
 * would sit at scroll position zero forever. The shell is the only part that
 * cannot ship here. Everything else is the component's own exports, composed:
 * NotchItem for every tab and every drawer row, with its layout-animated pill,
 * and the two wings for the concave corners. Nothing is redrawn in Tailwind.
 *
 * It carries the whole header now. There is no second row: the mark, the
 * destinations, the language toggle and Apply are all inside the one element.
 *
 * That element has two states and morphs between them. At the top of the page
 * it is the full-width white header, mark left, destinations centred, actions
 * right. Past 24px of scroll it draws in to a compact dark island: max-width,
 * padding, ground and bottom radius all transition, and the wings fade in to
 * cut the concave corners. One element, two states, so nothing crossfades
 * against a copy of itself. `data-compact` is the switch and every part reads
 * it through `group-data-[compact=true]/notch`, including the mark and the
 * Apply button, which are passed in as slots from the server component.
 *
 * The island's ground is GLASS, and it is BLACK glass. Both halves of that
 * are deliberate and they pull against each other: alpha alone cannot do it,
 * because 72% black over the white page composites to charcoal, which is a
 * grey bar, not a dark one. So the backdrop is darkened before the fill lands
 * on it: `backdrop-brightness-[0.4]` with `backdrop-saturate-150` under a
 * `bg-zinc-950/78`. White behind resolves to about #161616 and dark copy
 * behind resolves to near #000, so the bar reads black and what is scrolling
 * underneath still registers as movement through it rather than being deleted
 * by it. Raise the brightness and it greys; drop the alpha and it greys.
 *
 * Two things follow, both load bearing:
 *
 *   - The sticky header behind it paints nothing once scrolled (chrome.tsx).
 *     A white bar behind the glass is a second sheet: the page would already
 *     be covered one layer earlier and the transparency would buy nothing.
 *   - The wings stay at the source's SOLID `text-zinc-950`. They are SVG
 *     fills, so no backdrop filter reaches them; matching the island by alpha
 *     instead put a charcoal fillet beside a black edge, which is a seam.
 *     Against glass this dark, solid black is the closer match.
 *
 * The bottom radius is 18px, the Apply pill's own radius at its height, so the
 * island, the pill inside it and the sliding tab mark all draw one corner.
 *
 * It also collapses. Below `lg` the three destinations plus the mark plus Apply
 * measure past a 390px viewport, so the compact state shows the current
 * destination as a disclosure and opens the rest in a drawer beneath itself,
 * which is the shape the source component's own compact island uses. Opening
 * that drawer is itself a reason to be compact: the rows need the dark ground
 * whether or not the page has been scrolled.
 *
 * The tabs are buttons, not links, because that is NotchItem's structure and
 * AGENTS.md forbids rewriting a library component into a Moni-specific one. The
 * sections stay reachable by URL: every id here is a real anchor on `/`, and
 * off the homepage (the legal pages render this same header) a press routes to
 * `/#id` rather than scrolling to a section that is not there.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { LayoutGroup, MotionConfig } from 'framer-motion'
import {
  NotchItem,
  NotchLeftWing,
  NotchRightWing,
  type NotchItemData,
} from '@/components/ui/adaptive-notch-navigation-bar.tsx'
import { ScrollTrigger } from '@/lib/motion/gsap.ts'
import type { Copy, Locale } from '@/lib/marketing/copy'

/** How long a press's smooth scroll is allowed to take before the scroll
 *  position is trusted again regardless. Only a failsafe: the lock normally
 *  lifts the moment the target section is the one being read. */
const SETTLE_MS = 1600

export function HeaderNotchNav({
  nav,
  locale,
  logo,
  action,
}: {
  nav: Copy['nav']
  locale: Locale
  /** Rendered on the server and passed in as a slot, the way the source
   *  component takes its own `logo` and `rightContent`. */
  logo: React.ReactNode
  action: React.ReactNode
}) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  /* Compact is the whole visual contract: glass ground, drawn-in width, wings.
     An open drawer forces it because its rows are light-on-dark and would be
     unreadable against the white bar. */
  const compact = isScrolled || isOpen

  /* The id a press is currently scrolling towards. While it is set, scroll
     position does NOT get to say what is active.

     This is the back-and-forth fix. A press starts a smooth scroll that passes
     through every section between here and there, and the trigger below reads
     the scroll on every frame, so pressing Questions from the top ran the pill
     How -> proof -> Questions and pressing back up ran it in reverse. The pill
     was reporting the journey instead of the destination. */
  const pendingRef = useRef<string | null>(null)

  /* Same threshold and the same reasoning as HeaderScrollState: ScrollTrigger
     rather than a scroll listener, so this read joins the rAF already batching
     every other trigger instead of adding a second unthrottled one. It is a
     separate trigger from the section reader below because that one returns
     early on the legal pages, and the morph has to work there too. */
  useEffect(() => {
    const trigger = ScrollTrigger.create({
      start: 24,
      end: () => ScrollTrigger.maxScroll(window) + 1,
      onToggle: (self) => setIsScrolled(self.isActive),
      /* This is what states the position on arrival, and it has to be onRefresh
         rather than a setState in the effect body: ScrollTrigger calls it once
         on creation, so a visitor landing on /#faq is compact immediately
         instead of at their first scroll event. */
      onRefresh: (self) => setIsScrolled(self.isActive),
    })
    return () => trigger.kill()
  }, [])

  const items = useMemo<NotchItemData[]>(
    () => [
      { id: 'how', label: nav.how },
      { id: 'proof', label: nav.proof },
      { id: 'faq', label: nav.faq },
    ],
    [nav],
  )

  const home = locale === 'km' ? '/' : '/?lang=en'
  const otherHref = locale === 'km' ? '/?lang=en' : '/'
  const activeItem = items.find((item) => item.id === activeId)

  /* Which section is being read, through GSAP rather than a scroll listener.
     AGENTS.md puts scroll POSITION on GSAP and leaves React state transitions
     to motion, which is exactly the split here: ScrollTrigger decides the
     active id, the pill moving between tabs is motion's layout animation.
     HeaderScrollState makes the same argument for the same reason: this read
     lands in the rAF already batching every other trigger on the page rather
     than adding a second unthrottled one. */
  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)

    // The legal pages render this header with none of these sections present.
    if (sections.length === 0) return

    const read = () => {
      // Document order, so the last one to cross the line is the current one.
      const line = window.innerHeight * 0.4
      let current = ''
      for (const el of sections) {
        if (el.getBoundingClientRect().top <= line) current = el.id
      }

      const pending = pendingRef.current
      if (pending !== null) {
        // Still travelling. Say nothing until the destination is underfoot.
        if (current !== pending) return
        pendingRef.current = null
      }

      setActiveId(current)
    }
    read()

    const trigger = ScrollTrigger.create({
      start: 0,
      end: () => ScrollTrigger.maxScroll(window) + 1,
      onUpdate: read,
      onRefresh: read,
    })

    return () => trigger.kill()
  }, [items])

  /* A hand on the page outranks a press that is still in flight, so any real
     input cancels the lock rather than being ignored for the rest of it. */
  useEffect(() => {
    const release = () => {
      pendingRef.current = null
    }
    window.addEventListener('wheel', release, { passive: true })
    window.addEventListener('touchstart', release, { passive: true })
    window.addEventListener('keydown', release)
    return () => {
      window.removeEventListener('wheel', release)
      window.removeEventListener('touchstart', release)
      window.removeEventListener('keydown', release)
    }
  }, [])

  // Close the drawer on an outside press or Escape, as the source island does.
  useEffect(() => {
    if (!isOpen) return
    const onDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  const handleSelect = useCallback(
    (id: string) => {
      setIsOpen(false)

      const el = document.getElementById(id)
      if (!el) {
        router.push(`${home}#${id}`)
        return
      }

      // Mark the destination immediately and hold it: a tab that does not light
      // up until the scroll lands reads as a press that missed.
      setActiveId(id)
      pendingRef.current = id
      window.setTimeout(() => {
        if (pendingRef.current === id) pendingRef.current = null
      }, SETTLE_MS)

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })

      // replaceState, not a hash assignment: assigning the hash jumps the page
      // to the anchor instantly and cancels the smooth scroll that just began.
      window.history.replaceState(null, '', `#${id}`)
    },
    [home, router],
  )

  const languageLink = (className: string) => (
    <Link
      href={otherHref}
      hrefLang={nav.otherHref}
      onClick={() => setIsOpen(false)}
      className={className}
    >
      {nav.other}
    </Link>
  )

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex justify-center">
      {/* reducedMotion="user" is what keeps the sliding pill honest: with the
          setting on, the mark cuts to the pressed tab instead of travelling. */}
      <MotionConfig reducedMotion="user">
        <div
          ref={containerRef}
          data-compact={compact}
          className="group/notch pointer-events-auto relative flex w-full max-w-6xl flex-col rounded-b-none bg-transparent px-5 transition-[max-width,padding,background-color,border-radius] duration-500 ease-[var(--ease-settle)] data-[compact=true]:max-w-[21rem] data-[compact=true]:rounded-b-[18px] data-[compact=true]:bg-zinc-950/78 data-[compact=true]:px-3 data-[compact=true]:backdrop-blur-2xl data-[compact=true]:backdrop-brightness-[0.4] data-[compact=true]:backdrop-saturate-150 sm:px-8 sm:data-[compact=true]:max-w-[24rem] sm:data-[compact=true]:px-4 lg:data-[compact=true]:max-w-[41rem]"
        >
          {/* The wings only make sense once there is an island to cut into, and
              they grow out of its edges rather than fading in place. scale-x is
              doing real work here: the wings sit at `right-full` / `left-full`,
              so while the bar is full width they hang past both viewport edges,
              and `npm run shoot` counted two permanent overflowing elements for
              a pair of transparent 16px fillets. Collapsed against the notch
              edge they measure zero and the counter stays worth reading. */}
          <NotchLeftWing className="origin-right scale-x-0 opacity-0 transition-[transform,opacity] duration-300 group-data-[compact=true]/notch:scale-x-100 group-data-[compact=true]/notch:opacity-100" />
          <NotchRightWing className="origin-left scale-x-0 opacity-0 transition-[transform,opacity] duration-300 group-data-[compact=true]/notch:scale-x-100 group-data-[compact=true]/notch:opacity-100" />

          <nav aria-label="Primary" className="flex h-12 items-center gap-2 sm:gap-3">
            <Link href={home} aria-label="Moni" className="flex shrink-0 items-center">
              {logo}
            </Link>

            {/* Compact: the current destination, opening the rest beneath.
                Its own LayoutGroup id, so its pill and the wide bar's pill are
                two separate marks and never claim the same layoutId. */}
            <div className="flex flex-1 justify-center lg:hidden">
              <LayoutGroup id="moni-notch-compact">
                <NotchItem
                  id="menu"
                  label={activeItem?.label ?? nav.how}
                  icon={ChevronDown}
                  isActive={false}
                  onSelect={() => setIsOpen((open) => !open)}
                  role="button"
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  className={`h-9 px-2.5 text-[13px] text-label group-data-[compact=true]/notch:text-zinc-50 ${isOpen ? '[&_svg]:rotate-180' : ''} [&_svg]:transition-transform`}
                />
              </LayoutGroup>
            </div>

            {/* Wide: every destination at once. */}
            <div className="hidden flex-1 justify-center lg:flex">
              <LayoutGroup id="moni-notch-bar">
                <div role="tablist" aria-orientation="horizontal" className="flex items-center gap-1">
                  {items.map((item) => (
                    <NotchItem
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      isActive={item.id === activeId}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              </LayoutGroup>
            </div>

            {languageLink(
              'hidden shrink-0 px-2 text-sm text-label-2 transition-colors hover:text-label group-data-[compact=true]/notch:text-zinc-400 group-data-[compact=true]/notch:hover:text-zinc-200 lg:block',
            )}

            <div className="flex shrink-0 items-center">{action}</div>
          </nav>

          {/* The drawer, below lg. grid-rows 0fr -> 1fr animates to the content's
              own height with no measurement, which is the source island's
              mechanism and the same one globals.css uses for the FAQ. It needs
              no ground of its own: it sits inside the island, so the island's
              glass runs down behind it. */}
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out lg:hidden ${
              isOpen ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex w-full min-w-56 flex-col gap-0.5 pb-2.5 pt-1">
                <LayoutGroup id="moni-notch-drawer">
                  {items.map((item) => (
                    <NotchItem
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      isActive={item.id === activeId}
                      onSelect={handleSelect}
                      tabIndex={isOpen ? undefined : -1}
                      className="h-10 w-full justify-start rounded-xl px-3"
                    />
                  ))}
                </LayoutGroup>
                {languageLink(
                  'mt-1 block border-t border-zinc-800 px-3 pb-0.5 pt-3 text-sm text-zinc-400 transition-colors hover:text-zinc-200',
                )}
              </div>
            </div>
          </div>
        </div>
      </MotionConfig>
    </div>
  )
}
