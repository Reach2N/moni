'use client'

/**
 * The only file allowed to register a GSAP plugin, mirroring the rule that
 * src/lib/ai/models.ts is the only file allowed to name a model.
 *
 * MOTION SPLIT, decided 29 August 2026. Two animation libraries now ship in this
 * app and the division is by role, not by taste:
 *
 *   GSAP owns SCROLL.  Anything keyed to scroll position on the public site.
 *   `motion` owns STATE. In-app transitions and anything keyed to a React state
 *                        change, which is what PLAN.md section 3 specifies.
 *
 * The reason is not preference. `motion`'s whileInView is an IntersectionObserver,
 * and an IntersectionObserver cannot be settled on demand: a full-page screenshot
 * resizes the viewport and captures before the observer's callbacks have animated
 * anything, so every reveal below the fold photographs at opacity 0. That is
 * exactly how the 29 August landing capture came out blank below the hero with
 * 18 elements stuck at opacity 0. ScrollTrigger exposes refresh() and a real
 * scroll position, so a capture can drive it deterministically.
 *
 * GSAP 3.15 is free for commercial use including the formerly Club-only plugins,
 * under the Standard "No Charge" license: https://gsap.com/licensing/
 *
 * SplitText is deliberately NOT registered. It is the obvious tool for a
 * line-by-line headline reveal, and it works by re-wrapping the text node in
 * per-line elements. Khmer writes without spaces between words, so the line
 * boxes come from the browser's own Khmer line-breaking; re-wrapping the node
 * hands that job to GSAP's word splitter, which splits on spaces. On the Khmer
 * headline that is a shaping bug waiting to happen, and Khmer is the default
 * locale here. The headline reveals as one masked block instead.
 */

import { useEffect, useLayoutEffect, type RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/* Registration is module scope, not inside an effect. Registering per mount is
   idempotent but runs plugin init on every navigation, and a ScrollTrigger
   created before its plugin registers silently does nothing. */
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)

  /* iOS Safari fires a resize when the URL bar collapses, which re-runs every
     trigger's start/end mid-scroll and makes pinned sections jump. */
  ScrollTrigger.config({ ignoreMobileResize: true })

  /* GSAP's UMD build publishes itself on window; the ES module build does not.
     Republishing it here is what lets a tool outside React ask whether anything
     is still animating: scripts/shoot.mjs waits on an idle global timeline
     before it photographs the page, because the counting figure in the pricing
     band was otherwise captured mid-count at 88 on its way to 100. It is also
     what makes the GSAP devtools work against a production build.
     ??= so a page that already has GSAP from elsewhere is never clobbered. */
  ;(window as typeof window & { gsap?: typeof gsap }).gsap ??= gsap
}

export { gsap, ScrollTrigger }

/**
 * useLayoutEffect warns on every server render inside a 'use client' component.
 * The scroll setup genuinely needs to run before paint on the client, so branch
 * rather than downgrade to useEffect and accept a frame of unpositioned content.
 */
export const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export type Scene = {
  /** The subtree this scene is scoped to. Selector strings resolve inside it. */
  scope: HTMLElement
  /** False when the visitor asked for reduced motion. Build the static state. */
  motion: boolean
  gsap: typeof gsap
}

/**
 * Scopes a scroll scene to an element and tears it down completely on unmount.
 *
 * Reduced motion goes through gsap.matchMedia rather than a one-off matchMedia
 * read, because matchMedia re-runs the setup when the visitor changes the OS
 * setting mid-session and reverts the old branch for you. The CSS kill switch in
 * globals.css cannot help here: it zeroes CSS animation and transition
 * durations, and GSAP drives inline styles from JavaScript, so this branch is
 * the only thing honouring the preference on the landing page.
 */
export function useScrollScene(
  scope: RefObject<HTMLElement | null>,
  setup: (scene: Scene) => void,
  deps: readonly unknown[] = [],
) {
  useIsomorphicLayoutEffect(() => {
    const element = scope.current
    if (!element) return

    const mm = gsap.matchMedia()
    mm.add(
      {
        motion: '(prefers-reduced-motion: no-preference)',
        reduced: '(prefers-reduced-motion: reduce)',
      },
      (context) => {
        const { motion = false } = (context.conditions ?? {}) as { motion?: boolean }
        setup({ scope: element, motion, gsap })
      },
      element,
    )

    return () => mm.revert()
  }, deps)
}
