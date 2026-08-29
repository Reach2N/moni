/**
 * What the agent can actually do, one mark each.
 *
 * The page had no icons and no concrete references to the product, so a visitor
 * had to imagine what "answers your customers" meant. Six named capabilities
 * with a glyph apiece is the cheapest way to make it picturable, and each one
 * maps to a real tool in CUSTOMER_TOOLS rather than to a marketing adjective.
 */

import {
  IconAgentReply,
  IconClock,
  IconQr,
  IconRiel,
  IconShield,
  IconSlot,
} from '@/components/marketing/icons.tsx'
import type { Copy } from '@/lib/marketing/copy.ts'

const MARKS = [IconAgentReply, IconRiel, IconClock, IconSlot, IconQr, IconShield] as const

export function Capabilities({ copy }: { copy: Copy }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {copy.capabilities.items.map((item, index) => {
        const Mark = MARKS[index] ?? IconAgentReply
        return (
          <li
            key={item.title}
            className="rounded-[var(--radius-card)] border border-separator bg-surface p-5 shadow-[var(--shadow-card)]"
          >
            <span className="flex size-10 items-center justify-center rounded-[10px] bg-green/12 text-green">
              <Mark className="size-5" />
            </span>
            <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-label">{item.title}</h3>
            <p className="mt-1.5 text-[15px] text-pretty text-label-2">{item.body}</p>
          </li>
        )
      })}
    </ul>
  )
}
