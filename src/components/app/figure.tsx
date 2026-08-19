'use client'
/**
 * An animated quantity that works in any numeral system.
 *
 * Component sourcing, searched in order before building: shadcn has no numeric
 * display; the 21st.dev `barvian/number-flow` entry is a link stub containing only
 * a URL; and `@number-flow/react`, which that stub points at, builds its digit
 * track from ASCII 0 to 9, so with Khmer numerals it rendered the group separator
 * and dropped every digit. Nothing available carries non-Latin numerals, so this is
 * hand built, and deliberately small.
 *
 * Two rules from DESIGN.md are load bearing here. The Quantity Rule: each glyph
 * sits in a fixed-width cell so the figure never reflows as it grows. The One
 * Authored Moment Rule: 180ms, exponential ease-out from an already-visible
 * default, and it only ever runs because a real value changed.
 */
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

const KHMER_DIGIT = /[០-៩0-9]/

export function Figure({ text, className = '' }: { text: string; className?: string }) {
  const reduce = useReducedMotion()
  const chars = [...text]

  return (
    // one accessible reading of the whole quantity, so a screen reader is not
    // handed a pile of single characters
    <span className={className} role="img" aria-label={text}>
      {chars.map((char, i) => {
        const isDigit = KHMER_DIGIT.test(char)
        return (
          <span
            key={i}
            aria-hidden
            // NO overflow-hidden here: on an inline-block it moves the baseline to
            // the bottom margin edge, which drops the adjacent currency mark below
            // the digits. The exit animation fades to 0 opacity, so nothing needs
            // clipping and the baseline stays shared.
            className="relative inline-block align-baseline"
            // a digit takes a fixed cell; punctuation takes its natural advance
            style={isDigit ? { width: '0.62em' } : undefined}
          >
            {reduce ? (
              <span className="inline-block w-full text-center">{char}</span>
            ) : (
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={char}
                  initial={{ y: '-0.55em', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '0.55em', opacity: 0, position: 'absolute' }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-block w-full text-center"
                >
                  {char}
                </motion.span>
              </AnimatePresence>
            )}
          </span>
        )
      })}
    </span>
  )
}
