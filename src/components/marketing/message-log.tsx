/**
 * The messages a shop actually receives, as a ruled log.
 *
 * This was a marquee of rounded pills drifting sideways. A marquee is motion
 * for its own sake: it makes text unreadable while it moves, it has to be
 * duplicated to loop, and it needs a separate static fallback the moment a
 * reader asks for reduced motion. The same content set as a ruled list is
 * readable, needs no animation, no keyframe and no duplicate track, and looks
 * like the day's messages written down, which is the point being made.
 */

import { IconMessage } from '@/components/marketing/icons.tsx'
import type { Copy } from '@/lib/marketing/copy.ts'

export function MessageLog({ copy }: { copy: Copy }) {
  return (
    <ul className="divide-y divide-label/10 border-y border-label/15">
      {copy.channels.samples.map((sample) => (
        <li key={sample} className="flex items-start gap-3 py-2.5">
          <IconMessage className="mt-1 size-3.5 shrink-0 text-label-3" />
          <span className="min-w-0 text-[15px] text-pretty text-label-2">{sample}</span>
        </li>
      ))}
    </ul>
  )
}
