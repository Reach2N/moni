'use client'

/**
 * Recomputes every ScrollTrigger start/end once the fonts have actually loaded.
 *
 * Futura 100 Khmer arrives from Typekit only when NEXT_PUBLIC_TYPEKIT_ID is set,
 * and Busra is a self-hosted @font-face. Either way the swap changes the height
 * of every text block on the page AFTER first paint, so any trigger whose start
 * was measured against the fallback metrics fires at the wrong scroll position.
 * A pinned section measured against the wrong height is the visible version of
 * this bug: it unpins early and the next section slides under it.
 */

import { useEffect } from 'react'
import { ScrollTrigger } from '@/lib/motion/gsap.ts'

export function ScrollRefresh() {
  useEffect(() => {
    let cancelled = false

    const refresh = () => {
      if (!cancelled) ScrollTrigger.refresh()
    }

    // document.fonts is unsupported in no browser we target, but it is optional
    // in the type, and a rejected fonts.ready must not take the page down.
    document.fonts?.ready.then(refresh).catch(refresh)

    // A late image or a lazy iframe resizes the document too.
    window.addEventListener('load', refresh)
    return () => {
      cancelled = true
      window.removeEventListener('load', refresh)
    }
  }, [])

  return null
}
