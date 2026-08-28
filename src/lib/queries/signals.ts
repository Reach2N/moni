/**
 * What the shop needs from its owner, ranked, in the words she would use.
 *
 * PRODUCT.md: she opens this between customers, standing, in daylight, and her
 * job is to see who is coming, whether they paid, and what needs her attention.
 * She is not technical. So this file holds the whole judgement of what counts as
 * a problem, and the component that renders it holds none of it (CLAUDE.md rule
 * 9). It is a pure function of the snapshot, which is why the read time is
 * carried on the snapshot rather than read from the clock in here.
 *
 * Every signal answers three questions and refuses to ship without them: what is
 * true, why it matters to this shop today, and what she can do about it. A row
 * that cannot answer the third question does not get an action, because a button
 * that leads nowhere is worse than no button.
 */
import type { DashboardSnapshot } from './dashboard.ts'
import { durationKm, khmerDayLabel, khmerHalf, minutesToKhmerTime, moneyTotalKm, toKhmerDigits } from '../format/khmer.ts'
import { cambodiaDate, cambodiaMinutesOfDay } from '../time/cambodia.ts'

/**
 * Urgency, and it is never carried by colour alone. `act` draws the alert
 * triangle, `watch` the clock, `clear` the struck seal, so the board reads the
 * same in greyscale and in sunlight.
 */
export type SignalTone = 'act' | 'watch' | 'clear'

export type SignalIcon =
  | 'inbox'
  | 'money'
  | 'clock'
  | 'channel'
  | 'catalogue'
  | 'closure'
  | 'quota'
  | 'clear'

export type Signal = {
  id: string
  tone: SignalTone
  icon: SignalIcon
  /** The one fact, as a full sentence. Never a bare label. */
  title: string
  /** Why it changes what she does. Omitted when the title already says it. */
  detail?: string
  /** Where she goes next. Omitted when the product cannot actually take her there. */
  action?: { label: string; href: string }
}

const CHANNEL_NAMES: Record<string, string> = {
  telegram: 'តេលេក្រាម',
  messenger: 'ម៉ែសិនជឺ',
  instagram: 'អ៊ីនស្តាក្រាម',
  web: 'តំណក្នុងគេហទំព័រ',
}

export function channelNameKm(channel: string) {
  return CHANNEL_NAMES[channel] ?? channel
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Ranked worst first. Ordering is the product decision: a shop that cannot
 * receive messages at all outranks a shop that is merely owed money, and a
 * positive "all clear" is only ever reachable when nothing else fired, because a
 * reassurance printed next to a warning teaches her to distrust both.
 */
export function shopSignals(snapshot: DashboardSnapshot): Signal[] {
  const act: Signal[] = []
  const watch: Signal[] = []
  const now = new Date(snapshot.nowIso)
  const nowMinutes = cambodiaMinutesOfDay(snapshot.nowIso)

  // 1. No way in. Without a live channel there is no product: a customer writes
  //    and nobody, human or otherwise, is on the other end.
  const live = snapshot.channels.filter((entry) => entry.status === 'connected')
  const broken = snapshot.channels.filter((entry) => entry.status !== 'connected')
  if (live.length === 0) {
    act.push({
      id: 'channels-down',
      tone: 'act',
      icon: 'channel',
      title: 'អតិថិជនមិនអាចផ្ញើសារមក Moni បានទេ',
      detail: snapshot.channels.length === 0
        ? 'មិនទាន់មានបណ្តាញណាភ្ជាប់នៅឡើយទេ។ ភ្ជាប់តេលេក្រាមជាមុន ព្រោះវាចំណាយពេលតែពីរនាទី។'
        : `${broken.map((entry) => channelNameKm(entry.channel)).join(' និង ')} បានផ្តាច់។ សារដែលអតិថិជនផ្ញើមកពេលនេះ គ្មាននរណាឆ្លើយទេ។`,
    })
  }

  // 2. Nothing to sell. Moni never quotes from memory (PRODUCT.md principle 3),
  //    so an empty catalogue means it must refuse every price question it gets.
  if (snapshot.services.length === 0) {
    act.push({
      id: 'no-services',
      tone: 'act',
      icon: 'catalogue',
      title: 'Moni មិនទាន់ដឹងតម្លៃសេវារបស់អ្នកទេ',
      detail: 'Moni មិនប្រាប់តម្លៃដែលខ្លួនមិនដឹងឡើយ។ ពិពណ៌នាហាងម្តង រួច Moni រៀបចំសេវា តម្លៃ និងម៉ោងឱ្យ។',
      action: { label: 'ពិពណ៌នាហាង', href: '#shop-setup' },
    })
  }

  // 3. Conversations Moni handed back. This is the designed handoff, not an
  //    error path, so it is stated as work waiting rather than as a failure.
  if (snapshot.needsOwner.length > 0) {
    const first = snapshot.needsOwner[0]!
    act.push({
      id: 'needs-owner',
      tone: 'act',
      icon: 'inbox',
      title: `សារ ${toKhmerDigits(snapshot.needsOwner.length)} កំពុងរង់ចាំចម្លើយពីអ្នក`,
      detail: `Moni មិនប្រាកដចិត្ត ទើបទុកឱ្យអ្នកសម្រេច។ ចាប់ផ្តើមពី ${first.customer}។`,
      action: { label: 'មើលសារ', href: '#inbox' },
    })
  }

  // 4. Work done, money not handed over. Owed is computed on the snapshot so a
  //    part payment counts as part paid rather than as settled.
  const owed = moneyTotalKm(snapshot.today.owedByCurrency)
  if (owed) {
    const debtors = snapshot.today.bookings.filter(
      (booking) =>
        booking.balanceMinor > 0 && booking.status !== 'cancelled' && booking.status !== 'no_show',
    )
    act.push({
      id: 'unpaid-today',
      tone: 'act',
      icon: 'money',
      title: `នៅត្រូវទទួលលុយ ${owed} ពីថ្ងៃនេះ`,
      detail: `${debtors.map((booking) => booking.customer).join(' និង ')} មិនទាន់បង់គ្រប់ទេ។ ប្រាប់ Moni ពេលអ្នកទទួលបាន ដើម្បីកុំឱ្យសួរគាត់ម្តងទៀត។`,
      action: { label: 'មើលថ្ងៃនេះ', href: '#today' },
    })
  }

  // 5. Who walks in next. The single most asked question of the day, and the one
  //    the ledger answers only after she scans it.
  const upcoming = snapshot.today.bookings
    .filter(
      (booking) =>
        (booking.status === 'pending' || booking.status === 'confirmed') &&
        new Date(booking.startsAt).getTime() >= now.getTime(),
    )
    .toSorted((a, b) => a.startsAt.localeCompare(b.startsAt))
  const next = upcoming[0]
  if (next) {
    const minutesAway = Math.round((new Date(next.startsAt).getTime() - now.getTime()) / 60_000)
    watch.push({
      id: 'next-arrival',
      tone: 'watch',
      icon: 'clock',
      title: `អ្នកបន្ទាប់គឺ ${next.customer} ម៉ោង ${minutesToKhmerTime(cambodiaMinutesOfDay(next.startsAt))}`,
      detail: minutesAway <= 120
        ? `${next.service} ជាមួយ ${next.resource}។ នៅសល់ ${durationKm(Math.max(minutesAway, 1))} ទៀត។`
        : `${next.service} ជាមួយ ${next.resource}។`,
      action: { label: 'មើលថ្ងៃនេះ', href: '#today' },
    })
  }

  // 6. An open day with nothing in it. Stated while she can still do something
  //    about it, and never after closing time, when it is only bad news.
  const openToday = snapshot.today.openMinutes
  const liveBookings = snapshot.today.bookings.filter((booking) => booking.status !== 'cancelled')
  if (openToday && liveBookings.length === 0 && nowMinutes < openToday.close) {
    watch.push({
      id: 'empty-day',
      tone: 'watch',
      icon: 'clock',
      title: 'ថ្ងៃនេះមិនទាន់មានការណាត់ណាមួយទេ',
      detail: `ហាងបើករហូតដល់ម៉ោង ${minutesToKhmerTime(openToday.close)}។ ប្រាប់ Moni ឱ្យផ្ញើតំណកក់ទៅអតិថិជនចាស់។`,
      action: { label: 'ប្រាប់ Moni', href: '#moni' },
    })
  }

  // 7. A closure the calendar knows about and she may not. Only the next one:
  //    a list of future closures is a calendar, not a warning.
  const closure = snapshot.closures[0]
  if (closure) {
    const daysAway = Math.floor((new Date(closure.startsAt).getTime() - now.getTime()) / DAY_MS)
    if (daysAway >= 0 && daysAway <= 7) {
      const date = cambodiaDate(new Date(closure.startsAt))
      watch.push({
        id: `closure-${closure.id}`,
        tone: 'watch',
        icon: 'closure',
        title: `ហាងបិទ ${khmerDayLabel(date)}`,
        detail: closure.reason
          ? `${khmerHalf(closure.reason)}។ Moni នឹងមិនកក់ម៉ោងណាក្នុងថ្ងៃនោះទេ។`
          : 'Moni នឹងមិនកក់ម៉ោងណាក្នុងថ្ងៃនោះទេ។',
      })
    }
  }

  // 8. The quota, expressed as bookings rather than as "transactions". She has
  //    never bought software and the billing word means nothing to her.
  if (snapshot.usage.left <= 25) {
    const spent = snapshot.usage.left <= 10
    const signal: Signal = {
      id: 'quota',
      tone: spent ? 'act' : 'watch',
      icon: 'quota',
      title: `គម្រោងឥតគិតថ្លៃនៅសល់ ${toKhmerDigits(snapshot.usage.left)} ការកក់ក្នុងខែនេះ`,
      detail: 'ពេលអស់ Moni នៅតែឆ្លើយសារ ប៉ុន្តែឈប់កក់ម៉ោងថ្មីរហូតដល់ដើមខែក្រោយ។',
    }
    if (spent) act.push(signal)
    else watch.push(signal)
  }

  if (act.length === 0 && watch.length === 0) {
    return [{
      id: 'all-clear',
      tone: 'clear',
      icon: 'clear',
      title: 'គ្មានអ្វីត្រូវការអ្នកឥឡូវនេះទេ',
      detail: 'Moni កំពុងឆ្លើយសារ និងកក់ម៉ោងជំនួសអ្នក។ ពេលមានរឿងត្រូវសម្រេច វានឹងបង្ហាញនៅទីនេះ។',
    }]
  }

  return [...act, ...watch]
}
