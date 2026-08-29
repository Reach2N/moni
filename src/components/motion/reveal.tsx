'use client'

/**
 * The scroll reveal for the public site. Replaces BlurFade's whileInView on
 * every marketing surface; BlurFade stays where it is used inside the app.
 *
 * The load-bearing detail is gsap.from(), not gsap.to(). `from` reads the
 * element's natural rendered state as the END of the tween and only then sets
 * the start values, so the markup ships VISIBLE and JavaScript hides it for a
 * moment. Everything that goes wrong with a reveal goes wrong the other way
 * round: markup that ships at opacity 0 waiting to be animated in is a blank
 * page with JavaScript disabled, a blank page in a crawler, and a blank page in
 * a full-page screenshot whose observers never settled. That last one is not
 * hypothetical here: see the note in src/lib/motion/gsap.ts.
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
      // Reduced motion: return without touching the element. Because this is a
      // `from` tween, doing nothing IS the finished state.
      if (!motion) return

      const targets = stagger === undefined ? scope : Array.from(scope.children)
      if (Array.isArray(targets) && targets.length === 0) return

      gsap.from(targets, {
        y,
        opacity: 0,
        filter: blur ? 'blur(6px)' : 'none',
        duration: 0.7,
        delay,
        ease: 'power3.out',
        stagger: stagger ?? 0,
        scrollTrigger: { trigger: scope, start, once: true },
      })
    },
    [y, delay, stagger, start, blur],
  )

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
