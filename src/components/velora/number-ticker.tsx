'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { useScrollScene } from '@/lib/motion/gsap.ts'

interface NumberTickerProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number
  startValue?: number
  /** Seconds to wait after entering the viewport */
  delay?: number
  /**
   * How the number is written. REQUIRED for any user-facing quantity.
   *
   * The source kit hardcoded Intl.NumberFormat("en-US") here, which renders
   * Latin digits. Khmer is the default locale on this site, so that silently
   * printed "100" where the rest of the page prints "១០០". Formatting a
   * quantity belongs to src/lib/format/khmer.ts and nowhere else, so the caller
   * passes the formatter in rather than this component growing a locale prop.
   */
  formatValue?: (value: number) => string
}

/**
 * A number that counts up when it scrolls into view.
 *
 * Two changes from the source kit, both about what happens when the animation
 * never runs. It now renders the FINAL value on the server and counts from the
 * start value only once JavaScript takes over, so a crawler, a reader with
 * JavaScript off, and a screenshot all read the true figure instead of a zero.
 * And it drives GSAP rather than motion's useInView, per the scroll/state split
 * in src/lib/motion/gsap.ts.
 */
export function NumberTicker({
  value,
  startValue = 0,
  delay = 0,
  formatValue = (n) => String(Math.round(n)),
  className,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useScrollScene(
    ref,
    ({ scope, motion, gsap }) => {
      // Reduced motion keeps the server-rendered final value.
      if (!motion) return

      const counter = { n: startValue }
      scope.textContent = formatValue(startValue)

      gsap.to(counter, {
        n: value,
        duration: 1.6,
        delay,
        ease: 'power2.out',
        onUpdate: () => {
          scope.textContent = formatValue(counter.n)
        },
        scrollTrigger: { trigger: scope, start: 'top 90%', once: true },
      })
    },
    [value, startValue, delay],
  )

  return (
    <span ref={ref} data-slot="number-ticker" className={cn('inline-block tabular-nums', className)} {...props}>
      {formatValue(value)}
    </span>
  )
}
