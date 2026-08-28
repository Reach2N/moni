import { Check, Inbox, Radio, Store, Tags, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DashboardSnapshot } from '@/lib/queries/dashboard.ts'
import { channelNameKm } from '@/lib/queries/signals.ts'
import { ownerReasonKm, relativeCambodiaTime, toKhmerDigits } from './dashboard-format.ts'
import { Panel, PanelHeader, PanelNote, PanelRow, PanelRows } from './panel.tsx'
import { SessionReceipts } from './receipt-rail.tsx'

/**
 * A shop status row. The old version printed four bare counts under the heading
 * "shop health", which is a phrase from software and not from a salon: an owner
 * who has never bought software cannot act on "transactions remaining: 97". Each
 * row now names the thing in her own terms and, where the number only matters
 * against a limit, says the limit in the same breath.
 */
function StatusRow({
  icon: Icon,
  label,
  value,
  state,
}: {
  icon?: LucideIcon
  label: string
  value: string
  state?: 'good' | 'bad'
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 border-t border-hairline px-3 py-1.5 first:border-t-0 sm:px-4">
      <dt className="km flex min-w-0 items-center gap-2 text-sm text-rule">
        {Icon ? <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden /> : null}
        <span className="min-w-0">{label}</span>
      </dt>
      <dd className="km tnum flex shrink-0 items-center gap-1.5 text-sm font-semibold text-ink">
        {/* State is a shape before it is a colour: the tick and the cross are
            different silhouettes, so this row survives greyscale and daylight. */}
        {state === 'good' ? <Check className="size-4 text-seal" strokeWidth={2} aria-hidden /> : null}
        {state === 'bad' ? <X className="size-4 text-rule" strokeWidth={2} aria-hidden /> : null}
        {value}
      </dd>
    </div>
  )
}

export function RightRail({ snapshot }: { snapshot: DashboardSnapshot }) {
  const connected = snapshot.channels.filter((entry) => entry.status === 'connected')

  return (
    <div className="flex flex-col gap-3">
      <SessionReceipts />

      <Panel id="inbox" aria-labelledby="inbox-heading" className="scroll-mt-4">
        <PanelHeader
          icon={Inbox}
          titleId="inbox-heading"
          title="សារដែលរង់ចាំអ្នក"
          {...(snapshot.needsOwner.length > 0 ? { count: snapshot.needsOwner.length } : {})}
        />

        {snapshot.needsOwner.length === 0 ? (
          <PanelNote icon={Check} title="គ្មានសារណាកំពុងរង់ចាំទេ">
            <p className="km mt-0.5 text-sm text-rule">
              Moni បានឆ្លើយសារទាំងអស់ដោយខ្លួនឯង។
            </p>
          </PanelNote>
        ) : (
          <PanelRows>
            {snapshot.needsOwner.map((conversation) => (
              <PanelRow key={conversation.id}>
                <div className="px-3 py-2.5 sm:px-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="km min-w-0 text-sm font-semibold text-ink">{conversation.customer}</p>
                    <p className="km tnum shrink-0 text-xs text-rule">
                      {relativeCambodiaTime(conversation.lastMessageAt)}
                    </p>
                  </div>
                  <p className="km mt-0.5 text-sm text-rule">{ownerReasonKm(conversation.reason)}</p>
                  <p className="km mt-0.5 text-xs text-rule">
                    មកតាម {channelNameKm(conversation.channel)}
                  </p>
                </div>
              </PanelRow>
            ))}
          </PanelRows>
        )}
      </Panel>

      <Panel aria-labelledby="status-heading">
        <PanelHeader
          icon={Store}
          titleId="status-heading"
          title="ស្ថានភាពហាង"
          note="អ្វីដែល Moni អាចធ្វើជំនួសអ្នកបានពេលនេះ"
        />
        <dl>
          <StatusRow
            icon={Radio}
            label="អតិថិជនផ្ញើសារមកតាម"
            value={connected.length > 0 ? connected.map((entry) => channelNameKm(entry.channel)).join(' និង ') : 'មិនទាន់មាន'}
            state={connected.length > 0 ? 'good' : 'bad'}
          />
          <StatusRow
            icon={Tags}
            label="សេវាដែល Moni អាចប្រាប់តម្លៃ"
            value={`${toKhmerDigits(snapshot.services.length)} មុខ`}
            state={snapshot.services.length > 0 ? 'good' : 'bad'}
          />
          <StatusRow
            icon={Store}
            label="បុគ្គលិក ឬកន្លែងទទួលភ្ញៀវ"
            value={`${toKhmerDigits(snapshot.resources.length)} កន្លែង`}
            state={snapshot.resources.length > 0 ? 'good' : 'bad'}
          />
          <StatusRow
            label="ការកក់នៅសល់ក្នុងខែនេះ"
            value={`${toKhmerDigits(snapshot.usage.left)} ក្នុង ${toKhmerDigits(snapshot.usage.limit)}`}
          />
          <StatusRow
            label="អតិថិជនបានសរសេរមកខែនេះ"
            value={`${toKhmerDigits(snapshot.usage.conversations)} នាក់`}
          />
        </dl>
      </Panel>
    </div>
  )
}
