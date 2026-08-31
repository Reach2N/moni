'use client'

/**
 * The scroll reveal for the public site. Replaces BlurFade's whileInView on
 * every marketing surface; BlurFade stays where it is used inside the app.
 *
 * The load-bearing detail is WHERE the start state comes from. It used to come
 * from gsap.from() with `immediateRender: false`, so that a section waiting
 * below the fold was never hidden: markup that ships at opacity 0 is a blank
 * page with JavaScript disabled, a blank page in a crawler, and a blank page in
 * a full-page screenshot whose observers never settled. That reasoning is right
 * and it is kept. What it did not survive is the moment the trigger fires:
 * `start: 'top 85%'` fires when the block is already a seventh of the way into
 * the viewport, and the start values then landed on something the visitor was
 * looking at. Fifteen blocks blinked out and faded back on one pass down the
 * page, measured 30 August 2026.
 *
 * So the start state ships in CSS, gated on the data-motion attribute the
 * marketing layout sets before first paint. No JavaScript means no attribute
 * means nothing was ever hidden, which is the same guarantee by a mechanism
 * that cannot arrive late. See the scroll entrances block in globals.css.
 */

import { useRef, type ReactNode } from 'react'
import { useScrollScene } from '@/lib/motion/gsap.ts'

type RevealProps = {
  children: ReactNode
  className?: string
  /** Distance travelled, in px. */
  y?: number
  delay?: number
  /**
   * When set, the wrapper's DIRECT CHILDREN are revealed in sequence by this
   * many seconds instead of the wrapper moving as one block.
   */
  stagger?: number
  /** ScrollTrigger start, in its own vocabulary. Default fires just inside the fold. */
  start?: string
  blur?: boolean
}

export function Reveal({
  children,
  className,
  y = 24,
  delay = 0,
  stagger,
  start = 'top 85%',
  blur = true,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useScrollScene(
    ref,
    ({ scope, motion, gsap }) => {
      // Reduced motion: return without touching the element. The CSS start
      // state is inside a `no-preference` query, so doing nothing IS the
      // finished state here too.
      if (!motion) return

      const targets = stagger === undefined ? [scope] : Array.from(scope.children)
      if (targets.length === 0) return

      /* Anything already on screen when the scene is built has been read at its
         finished state: a visitor who deep-linked to #apply, or who flipped the
         OS motion setting mid-page and made matchMedia rebuild every scene.
         Replaying an entrance under their eyes is the flicker this component
         exists to avoid, so settle it outright instead. */
      if (scope.getBoundingClientRect().top < window.innerHeight) {
        gsap.set(targets, { opacity: 1, y: 0, clearProps: 'filter' })
        return
      }

      /* fromTo, not from: the elements are already at opacity 0 from CSS, so a
         `from` tween would read that as the value to animate towards and hold
         them there. The explicit end state is now the only place the finished
         look is written down.

         immediateRender is left at its default, which for a fromTo is true.
         That re-asserts in inline styles the state CSS is already showing, so
         nothing changes visually, and it means the tween owns the element from
         the moment the scene is built rather than from the moment it fires. */
      gsap.fromTo(
        targets,
        { y, opacity: 0, filter: blur ? 'blur(6px)' : 'none' },
        {
          y: 0,
          opacity: 1,
          filter: 'blur(0px)',
          duration: 0.7,
          delay,
          ease: 'power3.out',
          stagger: stagger ?? 0,
          /* A settled block must not keep `filter: blur(0px)`. A filter other
             than none makes the element a containing block and forces it onto
             its own raster layer, which is how settled body copy ends up
             fractionally softer than the copy beside it. */
          clearProps: 'filter',
          scrollTrigger: { trigger: scope, start, once: true },
        },
      )
    },
    [y, delay, stagger, start, blur],
  )

  return (
    <div ref={ref} data-enter={stagger === undefined ? 'fade' : 'stagger'} className={className}>
      {children}
    </div>
  )
}
