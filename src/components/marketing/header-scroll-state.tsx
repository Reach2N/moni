'use client'

/**
 * Sets data-scrolled on the sticky header once the page leaves the top.
 *
 * A tiny client island rather than making SiteHeader itself a client component:
 * the header is otherwise static markup and links, and it renders on the legal
 * pages too, so there is no reason to ship it all to the browser for one boolean.
 *
 * ScrollTrigger owns this rather than a scroll listener because it is already
 * running on this page and it batches its reads into one rAF with every other
 * trigger. A separate listener would be a second, unthrottled layout read on
 * every scroll event.
 */

import { useEffect } from 'react'
import { ScrollTrigger } from '@/lib/motion/gsap.ts'

export function HeaderScrollState() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('[data-site-header]')
    if (!header) return

    const apply = (scrolled: boolean) => {
      header.dataset.scrolled = String(scrolled)
    }
    apply(window.scrollY > 24)

    // No trigger element: start/end are absolute scroll positions on the page,
    // so isActive is simply "scrolled past 24px and not yet at the very end".
    const trigger = ScrollTrigger.create({
      start: 24,
      /* +1 because isActive is false AT the end, not past it. Ending exactly at
         maxScroll meant the last reachable scroll position sat outside the
         range, so the header's border, tint and blur all switched off the
         instant the visitor reached the bottom of the page and came back the
         moment they scrolled up a pixel. Measured 30 August: scrolled=true at
         6878, scrolled=false at 6880, which is maxScroll. */
      end: () => ScrollTrigger.maxScroll(window) + 1,
      onToggle: (self) => apply(self.isActive),
    })

    return () => trigger.kill()
  }, [])

  return null
}
