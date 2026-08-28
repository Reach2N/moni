/**
 * The notice board decides what a shop owner is told to worry about, so its
 * rules get asserted rather than eyeballed. The states that matter most here are
 * the ones the demo data can never show: a brand new shop with nothing wired up,
 * a shop whose channel has dropped, and a quiet day that has not ended yet.
 *
 *   node --experimental-strip-types scripts/signals-test.mjs
 */
import assert from 'node:assert/strict'
import { shopSignals } from '../src/lib/queries/signals.ts'

const failures = []
function check(name, run) {
  try {
    run()
    console.log(`  ok   ${name}`)
  } catch (error) {
    failures.push(name)
    console.log(`  FAIL ${name}\n       ${error.message.split('\n')[0]}`)
  }
}

/** A healthy shop mid morning: open, staffed, connected, everything paid. */
function snapshot(overrides = {}) {
  return {
    business: {
      id: 'b1', slug: 'demo', name: 'Demo', businessType: 'salon', category: 'services',
      phone: null, address: null, province: null, timezone: 'Asia/Phnom_Penh',
      currency: 'KHR', locale: 'km', hours: [], plan: 'free', quota: 100,
    },
    services: [{ id: 's1' }],
    resources: [{ id: 'r1', name: 'Sokha', kind: 'staff' }],
    channels: [{ channel: 'telegram', displayName: '@bot', status: 'connected', lastError: null }],
    closures: [],
    nowIso: '2026-08-19T03:00:00+00:00', // 10:00 in Phnom Penh
    today: {
      date: '2026-08-19', start: '', end: '',
      bookings: [],
      collectedMinor: 0, collectedByCurrency: {}, owedByCurrency: {},
      openMinutes: { open: 480, close: 1140 },
      waitingCount: 0,
    },
    needsOwner: [],
    usage: { month: '2026-08', plan: 'free', limit: 100, used: 3, left: 97, conversations: 5 },
    ...overrides,
  }
}

const booking = (over = {}) => ({
  id: 'bk1', code: 'MN1A2B', status: 'confirmed',
  startsAt: '2026-08-19T07:00:00+00:00', endsAt: '2026-08-19T07:30:00+00:00',
  customer: 'រតនា', customerPhone: null, service: 'កាត់សក់', serviceEn: 'Haircut',
  resource: 'សុខា', channel: 'telegram',
  priceMinor: 15000, paidMinor: 15000, balanceMinor: 0, currency: 'KHR',
  ...over,
})

const ids = (signals) => signals.map((signal) => signal.id)

console.log('shop signals')

check('a brand new shop is told the two things blocking it, worst first', () => {
  const signals = shopSignals(snapshot({ services: [], channels: [] }))
  assert.equal(signals[0].id, 'channels-down')
  assert.equal(signals[1].id, 'no-services')
  assert.equal(signals[0].tone, 'act')
})

check('a dropped channel names the channel it lost', () => {
  const signals = shopSignals(snapshot({
    channels: [{ channel: 'telegram', displayName: '@bot', status: 'error', lastError: 'unauthorized' }],
  }))
  const down = signals.find((signal) => signal.id === 'channels-down')
  assert.ok(down, 'expected a channels-down signal')
  assert.match(down.detail, /តេលេក្រាម/)
  assert.doesNotMatch(down.detail, /unauthorized/, 'a driver error string is not owner copy')
})

check('a connected channel raises nothing', () => {
  assert.equal(ids(shopSignals(snapshot())).includes('channels-down'), false)
})

check('unpaid work is reported with the amount and the person', () => {
  const signals = shopSignals(snapshot({
    today: { ...snapshot().today, owedByCurrency: { KHR: 15000 }, bookings: [booking({ status: 'completed', paidMinor: 0, balanceMinor: 15000 })] },
  }))
  const unpaid = signals.find((signal) => signal.id === 'unpaid-today')
  assert.ok(unpaid)
  assert.match(unpaid.title, /១៥,០០០៛/, 'the amount is Khmer numerals through moneyKm')
  assert.match(unpaid.detail, /រតនា/)
})

check('a cancelled booking is not a debt', () => {
  const signals = shopSignals(snapshot({
    today: { ...snapshot().today, owedByCurrency: {}, bookings: [booking({ status: 'cancelled', paidMinor: 0, balanceMinor: 15000 })] },
  }))
  assert.equal(ids(signals).includes('unpaid-today'), false)
})

check('riel and dollars are listed, never summed', () => {
  const signals = shopSignals(snapshot({
    today: { ...snapshot().today, owedByCurrency: { KHR: 15000, USD: 500 } },
  }))
  const unpaid = signals.find((signal) => signal.id === 'unpaid-today')
  assert.match(unpaid.title, /១៥,០០០៛/)
  assert.match(unpaid.title, /\$៥\.០០/)
})

check('the next arrival is the next one, not the first one', () => {
  const signals = shopSignals(snapshot({
    today: {
      ...snapshot().today,
      bookings: [
        booking({ id: 'past', startsAt: '2026-08-19T01:00:00+00:00', customer: 'ចាន់' }),
        booking({ id: 'soon', startsAt: '2026-08-19T04:00:00+00:00', customer: 'សុភា' }),
        booking({ id: 'later', startsAt: '2026-08-19T09:00:00+00:00', customer: 'ដារ៉ា' }),
      ],
    },
  }))
  const next = signals.find((signal) => signal.id === 'next-arrival')
  assert.match(next.title, /សុភា/)
  assert.match(next.detail, /១ ម៉ោង/, 'an hour away reads as an hour, never as 60 minutes')
})

check('a quiet day is raised while she can still fill it', () => {
  assert.equal(ids(shopSignals(snapshot())).includes('empty-day'), true)
})

check('a quiet day is not raised after closing', () => {
  const signals = shopSignals(snapshot({ nowIso: '2026-08-19T13:00:00+00:00' })) // 20:00 local
  assert.equal(ids(signals).includes('empty-day'), false)
})

check('a quiet day is not raised on a day the shop is shut', () => {
  const signals = shopSignals(snapshot({ today: { ...snapshot().today, openMinutes: null } }))
  assert.equal(ids(signals).includes('empty-day'), false)
})

check('a closure is dated in Phnom Penh, not in UTC', () => {
  // Midnight Sunday 23 August in Cambodia is 17:00 Saturday 22 August UTC.
  const signals = shopSignals(snapshot({
    closures: [{ id: 'c1', startsAt: '2026-08-22T17:00:00+00:00', endsAt: '2026-08-23T16:59:00+00:00', reason: 'បិទសម្រាប់អាពាហ៍ពិពាហ៍ / closed for a wedding' }],
  }))
  const closure = signals.find((signal) => signal.id.startsWith('closure-'))
  assert.match(closure.title, /ថ្ងៃអាទិត្យ/, 'Sunday, not Saturday')
  assert.doesNotMatch(closure.detail, /closed|wedding/, 'the English half of a bilingual reason is dropped')
})

check('a closure more than a week out is not a warning yet', () => {
  const signals = shopSignals(snapshot({
    closures: [{ id: 'c1', startsAt: '2026-09-15T17:00:00+00:00', endsAt: '2026-09-16T16:59:00+00:00', reason: null }],
  }))
  assert.equal(signals.some((signal) => signal.id.startsWith('closure-')), false)
})

check('the quota escalates from watch to act as it runs out', () => {
  const low = shopSignals(snapshot({ usage: { ...snapshot().usage, used: 80, left: 20 } }))
  assert.equal(low.find((signal) => signal.id === 'quota').tone, 'watch')
  const gone = shopSignals(snapshot({ usage: { ...snapshot().usage, used: 95, left: 5 } }))
  assert.equal(gone.find((signal) => signal.id === 'quota').tone, 'act')
})

check('a healthy shop with a full day is told so, once', () => {
  const signals = shopSignals(snapshot({
    today: { ...snapshot().today, bookings: [booking({ status: 'completed' })] },
  }))
  assert.deepEqual(ids(signals), ['all-clear'])
  assert.equal(signals[0].tone, 'clear')
})

check('reassurance never prints beside a warning', () => {
  const signals = shopSignals(snapshot({ needsOwner: [{ id: 'c', channel: 'telegram', customer: 'ដារ៉ា', reason: 'x', lastMessageAt: '' }] }))
  assert.equal(ids(signals).includes('all-clear'), false)
})

check('every act signal outranks every watch signal', () => {
  const signals = shopSignals(snapshot({
    services: [],
    needsOwner: [{ id: 'c', channel: 'telegram', customer: 'ដារ៉ា', reason: 'x', lastMessageAt: '' }],
  }))
  const lastAct = signals.findLastIndex((signal) => signal.tone === 'act')
  const firstWatch = signals.findIndex((signal) => signal.tone === 'watch')
  assert.ok(firstWatch === -1 || lastAct < firstWatch)
})

check('an action never points at a door the product cannot open', () => {
  const anchors = new Set(['#inbox', '#today', '#moni', '#needs-now', '#shop-setup'])
  const everyState = [
    shopSignals(snapshot({ services: [], channels: [] })),
    shopSignals(snapshot({ needsOwner: [{ id: 'c', channel: 'telegram', customer: 'ដារ៉ា', reason: 'x', lastMessageAt: '' }] })),
    shopSignals(snapshot({ today: { ...snapshot().today, owedByCurrency: { KHR: 1 }, bookings: [booking({ balanceMinor: 1 })] } })),
    shopSignals(snapshot()),
  ].flat()
  for (const signal of everyState) {
    if (!signal.action) continue
    assert.ok(anchors.has(signal.action.href), `${signal.id} points at ${signal.action.href}`)
    assert.ok(signal.action.label.length > 0, `${signal.id} has an unlabelled action`)
  }
})

check('no signal ships an em dash or a Latin digit', () => {
  const everyState = [
    shopSignals(snapshot({ services: [], channels: [] })),
    shopSignals(snapshot({ usage: { ...snapshot().usage, used: 95, left: 5 } })),
    shopSignals(snapshot({ today: { ...snapshot().today, owedByCurrency: { KHR: 15000 }, bookings: [booking({ balanceMinor: 15000 })] } })),
    shopSignals(snapshot()),
  ].flat()
  for (const signal of everyState) {
    const text = `${signal.title} ${signal.detail ?? ''} ${signal.action?.label ?? ''}`
    assert.doesNotMatch(text, /—/, `${signal.id} contains an em dash`)
    assert.doesNotMatch(text, /[0-9]/, `${signal.id} contains a Latin digit`)
  }
})

console.log(failures.length === 0 ? '\nall signal checks passed' : `\n${failures.length} failed`)
process.exit(failures.length === 0 ? 0 : 1)
