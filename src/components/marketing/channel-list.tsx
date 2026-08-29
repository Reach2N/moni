/**
 * Every channel Moni answers on, at equal weight.
 *
 * The marks are the real ones (see channel-marks.tsx), each at full strength in
 * its own published brand colour. An earlier revision dimmed four of the five
 * to 45% behind Next/Planned badges; the product decision is that the page
 * shows the complete channel set, so the row now says what Moni HANDLES on each
 * platform rather than when that platform lands.
 */

import {
  MarkFacebook,
  MarkGrab,
  MarkInstagram,
  MarkMessenger,
  MarkTelegram,
} from '@/components/marketing/channel-marks.tsx'
import type { Copy } from '@/lib/marketing/copy.ts'

const MARKS = [MarkTelegram, MarkMessenger, MarkFacebook, MarkInstagram, MarkGrab] as const

export function ChannelList({ copy }: { copy: Copy }) {
  return (
    <ul className="divide-y divide-separator">
      {copy.channels.platforms.map((platform, index) => {
        const Mark = MARKS[index] ?? MarkTelegram
        return (
          <li key={platform.name} className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-separator bg-surface shadow-[var(--shadow-card)]">
              <Mark className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-label">{platform.name}</p>
              <p className="truncate text-[13px] text-label-2">{platform.note}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
