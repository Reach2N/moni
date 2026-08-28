'use client'
import { motion, useReducedMotion } from 'motion/react'

/**
 * The struck seal. Three states, and each is a different SHAPE, never only a
 * different colour, so the row reads correctly in sunlight, in greyscale, and to
 * anyone who cannot separate green from grey.
 *
 * paid    a struck double ring with a mark inside
 * waiting the same ring, its outer course broken, so the seal column stays aligned
 * void    an empty ring, the row's terms carry the strike
 *
 * A receipt may press this like a rubber stamp hitting paper, 180ms with an
 * exponential settle. Static booking states reuse the same geometry without
 * suggesting that a completed service has also been paid.
 */
export type SealState = 'paid' | 'waiting' | 'void'

export function Seal({ state, pressed }: { state: SealState; pressed?: boolean }) {
  const reduce = useReducedMotion()
  const stroke = state === 'paid' ? 'var(--color-seal)' : 'var(--color-rule)'

  return (
    <motion.svg
      viewBox="0 0 40 40"
      width={34}
      height={34}
      aria-hidden
      initial={false}
      animate={reduce ? {} : pressed ? { scale: [0.86, 1.04, 1] } : { scale: 1 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* one footprint for every state: same centre, same radii, so the seal
          column never goes ragged. waiting differs by a broken outer course. */}
      <circle
        cx="20"
        cy="20"
        r="14.5"
        fill="none"
        stroke={stroke}
        strokeWidth={1.25}
        strokeDasharray={state === 'waiting' ? '3 4' : undefined}
      />
      {state !== 'waiting' && (
        <circle cx="20" cy="20" r="11" fill="none" stroke={stroke} strokeWidth={0.75} />
      )}
      {state === 'paid' && (
        <path
          d="M14.5 20.5 L18.5 24.5 L26 15.5"
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      )}
    </motion.svg>
  )
}
