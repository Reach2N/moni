/**
 * Where a shop's customers already are, and how true each one is today.
 *
 * The marks are the real ones (see channel-marks.tsx). What keeps that honest
 * is the badge beside each: exactly one channel is live, and the rest say so.
 * A live channel shows its brand colour at full strength; the others are held
 * back to 45% and carry a hairline badge instead of a filled one, so the row
 * reads as a roadmap at a glance rather than as five working integrations.
 */

import {
  MarkFacebook,
  MarkGrab,
  MarkInstagram,
  MarkMessenger,
  MarkTelegram,
} from '@/components/marketing/channel-marks.tsx'
import { IconCheck } from '@/components/marketing/icons.tsx'
import type { Copy } from '@/lib/marketing/copy.ts'

const MARKS = [MarkTelegram, MarkMessenger, MarkFacebook, MarkInstagram, MarkGrab] as const

export function ChannelList({ copy }: { copy: Copy }) {
  return (
    <ul className="divide-y divide-separator">
      {copy.channels.platforms.map((platform, index) => {
        const Mark = MARKS[index] ?? MarkTelegram
        return (
          <li key={platform.name} className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-separator bg-surface ${
                platform.live ? '' : 'opacity-45 grayscale-[0.15]'
              }`}
            >
              <Mark className="size-4.5" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-label">{platform.name}</p>
              <p className="truncate text-[13px] text-label-2">{platform.note}</p>
            </div>

            {platform.live ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-on-green">
                <IconCheck className="size-3" />
                {platform.badge}
              </span>
            ) : (
              <span className="shrink-0 rounded-full border border-separator px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-label-3">
                {platform.badge}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
