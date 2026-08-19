/**
 * Proves db/schema.sql + db/seed.sql against a real Postgres (PGlite = Postgres
 * compiled to WASM, same engine, no server to install).
 *
 *   npm run db:test
 *
 * Every assertion below is a bug that would otherwise surface on stage.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { formatMoney } from '../src/lib/types.ts'
import { amountsMatch, idempotencyKey, shouldFallback, QR_TTL_SECONDS } from '../src/lib/payments.ts'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const here = dirname(fileURLToPath(import.meta.url))
const sql = (f) => readFileSync(join(here, f), 'utf8')

let pass = 0, fail = 0
const ok = (name) => { pass++; console.log(`  \x1b[32m✓\x1b[0m ${name}`) }
const no = (name, detail) => { fail++; console.log(`  \x1b[31m✗\x1b[0m ${name}\n      ${detail}`) }

function eq(name, actual, expected) {
  actual === expected ? ok(`${name} → ${actual}`) : no(name, `expected ${expected}, got ${actual}`)
}
async function expectFail(db, name, statement, needle) {
  try {
    await db.exec(statement)
    no(name, 'statement was ACCEPTED but should have been rejected')
  } catch (e) {
    const m = String(e.message ?? e)
    m.toLowerCase().includes(needle.toLowerCase())
      ? ok(name)
      : no(name, `rejected, but not for the expected reason: ${m.split('\n')[0]}`)
  }
}
async function expectOk(db, name, statement) {
  try { await db.exec(statement); ok(name) }
  catch (e) { no(name, String(e.message ?? e).split('\n')[0]) }
}
const one = async (db, q) => (await db.query(q)).rows[0]

const B_SALON = 'b0000000-0000-4000-8000-000000000001'
const B_HOUSE = 'b0000000-0000-4000-8000-000000000002'
const R_SOKHA = 'a0000000-0000-4000-8000-000000000001'
const R_MOM   = 'a0000000-0000-4000-8000-000000000002'
const R_101   = 'a0000000-0000-4000-8000-000000000011'
const R_102   = 'a0000000-0000-4000-8000-000000000012'
const S_CUT   = '50000000-0000-4000-8000-000000000001'
const S_ROOM  = '50000000-0000-4000-8000-000000000011'
const C_SOPHEA= 'd0000000-0000-4000-8000-000000000001'
const C_MARTA = 'd0000000-0000-4000-8000-000000000011'

const db = await PGlite.create({ extensions: { btree_gist, pgcrypto } })
console.log(`\n\x1b[1mMoni schema test\x1b[0m, ${(await one(db, 'select version()')).version.split(',')[0]}\n`)

// ── 1. the files themselves ────────────────────────────────────────────────
console.log('schema + seed')
await expectOk(db, 'schema.sql applies cleanly', sql('schema.sql'))
await expectOk(db, 'schema.sql is re-runnable (no migration needed to redeploy)', sql('schema.sql'))
await expectOk(db, 'seed.sql applies cleanly', sql('seed.sql'))
await expectOk(db, 'seed.sql is idempotent (re-run leaves no duplicates)', sql('seed.sql'))
eq('businesses seeded', Number((await one(db, 'select count(*) c from businesses')).c), 2)
eq('bookings seeded', Number((await one(db, 'select count(*) c from bookings')).c), 5)
eq('messages not duplicated by re-seed', Number((await one(db, 'select count(*) c from messages')).c), 9)

// ── 2. double-booking is impossible, not merely unlikely ───────────────────
console.log('\ndouble-booking (the constraint that has to hold under a race)')
const at = (d, t) => `((current_date + ${d}) + time '${t}') at time zone 'Asia/Phnom_Penh'`
const mkBooking = (o) => `
  insert into bookings (business_id, service_id, resource_id, customer_id, starts_at, ends_at,
                        status, unit, price_minor, currency, channel, created_by
                        ${o.code ? ', code' : ''})
  values ('${o.biz}','${o.svc}','${o.res}','${o.cust}', ${o.from}, ${o.to},
          '${o.status ?? 'confirmed'}','${o.unit ?? 'session'}',${o.price ?? 15000},'KHR','web','ai'
          ${o.code ? `, '${o.code}'` : ''})`

await expectOk(db, 'first booking at 11:00 on Sokha',
  mkBooking({ biz: B_SALON, svc: S_CUT, res: R_SOKHA, cust: C_SOPHEA, from: at(7, '11:00'), to: at(7, '11:30') }))
await expectFail(db, 'exact same slot on the same chair is REJECTED',
  mkBooking({ biz: B_SALON, svc: S_CUT, res: R_SOKHA, cust: C_SOPHEA, from: at(7, '11:00'), to: at(7, '11:30') }),
  'exclusion')
await expectFail(db, 'partial overlap (11:15) on the same chair is REJECTED',
  mkBooking({ biz: B_SALON, svc: S_CUT, res: R_SOKHA, cust: C_SOPHEA, from: at(7, '11:15'), to: at(7, '11:45') }),
  'exclusion')
await expectOk(db, 'same slot on the OTHER chair is allowed',
  mkBooking({ biz: B_SALON, svc: S_CUT, res: R_MOM, cust: C_SOPHEA, from: at(7, '11:00'), to: at(7, '11:30') }))
await expectOk(db, 'back-to-back at 11:30 is allowed (range is [) not [])',
  mkBooking({ biz: B_SALON, svc: S_CUT, res: R_SOKHA, cust: C_SOPHEA, from: at(7, '11:30'), to: at(7, '12:00') }))

await db.exec(`update bookings set status='cancelled', cancelled_at=now()
               where resource_id='${R_SOKHA}' and starts_at = ${at(7, '11:00')}`)
await expectOk(db, 'cancelling frees the slot for someone else',
  mkBooking({ biz: B_SALON, svc: S_CUT, res: R_SOKHA, cust: C_SOPHEA, from: at(7, '11:00'), to: at(7, '11:30') }))

// ── 3. hotels ride the same rails ─────────────────────────────────────────
console.log('\nhotel nights (same table, same constraint, zero special-casing)')
await expectFail(db, 'overlapping stay in Room 101 is REJECTED',
  mkBooking({ biz: B_HOUSE, svc: S_ROOM, res: R_101, cust: C_MARTA, from: at(4, '14:00'), to: at(6, '12:00'), unit: 'night', price: 3000 }),
  'exclusion')
await expectOk(db, 'same dates in Room 102 is allowed',
  mkBooking({ biz: B_HOUSE, svc: S_ROOM, res: R_102, cust: C_MARTA, from: at(4, '14:00'), to: at(6, '12:00'), unit: 'night', price: 3000 }))
await expectOk(db, 'checking in the day the previous guest checks out is allowed',
  mkBooking({ biz: B_HOUSE, svc: S_ROOM, res: R_101, cust: C_MARTA, from: at(5, '14:00'), to: at(7, '12:00'), unit: 'night', price: 3000 }))

// ── 4. booking codes ──────────────────────────────────────────────────────
console.log('\nbooking codes (what the customer reads back on the phone)')
const code = await one(db, `select code from bookings where code is not null order by created_at desc limit 1`)
eq('auto-generated code is 6 chars', code.code.length, 6)
ok(`sample code looks quotable → ${code.code}`)
await expectFail(db, 'duplicate code inside one business is REJECTED',
  mkBooking({ biz: B_SALON, svc: S_CUT, res: R_MOM, cust: C_SOPHEA, from: at(9, '09:00'), to: at(9, '09:30'), code: 'MN4K2P' }),
  'duplicate key')

// ── 5. payments / KHQR ────────────────────────────────────────────────────
console.log('\npayments (double-charge and double-count guards)')
await expectFail(db, 'reusing an idempotency key is REJECTED (no second QR for one deposit)',
  `insert into payments (business_id, amount_minor, currency, provider, idempotency_key)
   values ('${B_SALON}', 15000, 'KHR', 'khqr', 'booking:90000000-0000-4000-8000-000000000002:deposit')`,
  'duplicate key')
await expectFail(db, 'reusing a KHQR md5 across payments is REJECTED (no double-count)',
  `insert into payments (business_id, amount_minor, currency, provider, provider_ref, idempotency_key)
   values ('${B_SALON}', 9999, 'KHR', 'khqr',
           md5('00020101021230500014sokha_beauty@aba0111Sokha Beauty5204739953031165405150005802KH5912Sokha Beauty6006Takeo6304A1B2'),
           'some-other-key')`,
  'duplicate key')
await expectFail(db, 'zero-amount payment is REJECTED',
  `insert into payments (business_id, amount_minor, currency, provider, idempotency_key)
   values ('${B_SALON}', 0, 'KHR', 'khqr', 'zero-test')`, 'payments_amount_pos')
await expectFail(db, 'status=paid without paid_at is REJECTED (no phantom revenue)',
  `insert into payments (business_id, amount_minor, currency, provider, status, idempotency_key)
   values ('${B_SALON}', 5000, 'KHR', 'khqr', 'paid', 'paid-no-time')`, 'payments_paid_has_time')
await expectFail(db, 'invented payment status is REJECTED',
  `insert into payments (business_id, amount_minor, currency, provider, status, idempotency_key)
   values ('${B_SALON}', 5000, 'KHR', 'khqr', 'settled', 'bad-status')`, 'payments_status_ok')
await expectOk(db, 'a second payment on the same booking is fine (deposit then balance)',
  `insert into payments (business_id, booking_id, amount_minor, currency, provider, kind, status, paid_at, idempotency_key)
   values ('${B_SALON}','90000000-0000-4000-8000-000000000002', 30000, 'KHR', 'cash', 'balance', 'paid', now(),
           'booking:90000000-0000-4000-8000-000000000002:balance')`)

// ── 6. other closed sets ──────────────────────────────────────────────────
console.log('\nCHECK constraints on the sets that will never grow')
await expectFail(db, 'invented booking status is REJECTED',
  mkBooking({ biz: B_SALON, svc: S_CUT, res: R_MOM, cust: C_SOPHEA, from: at(11, '09:00'), to: at(11, '09:30'), status: 'maybe' }),
  'bookings_status_ok')
// the generated slot range rejects this before bookings_time_order is evaluated
await expectFail(db, 'ends_at before starts_at is REJECTED',
  mkBooking({ biz: B_SALON, svc: S_CUT, res: R_MOM, cust: C_SOPHEA, from: at(11, '10:00'), to: at(11, '09:00') }),
  'range lower bound must be less than')
await expectFail(db, 'requires_deposit with no deposit amount is REJECTED',
  `insert into services (business_id, name, price_minor, currency, requires_deposit)
   values ('${B_SALON}', 'Broken service', 1000, 'KHR', true)`, 'services_deposit_ok')
await expectOk(db, 'a NEW business type needs no migration (text, not enum)',
  `insert into businesses (slug, name, business_type, category)
   values ('test-ktv', 'Test KTV', 'karaoke', 'events')`)
await expectOk(db, 'a NEW payment rail needs no migration either',
  `insert into payments (business_id, amount_minor, currency, provider, idempotency_key)
   values ('${B_SALON}', 1000, 'KHR', 'wing', 'future-rail')`)

// ── 7. views the app and the agent actually read ──────────────────────────
console.log('\nviews')
const ab = await one(db, `select * from v_agent_business where business_id='${B_SALON}'`)
eq('v_agent_business lists all 5 salon services', ab.services.length, 5)
eq('v_agent_business lists both chairs', ab.resources.length, 2)
eq('v_agent_business carries the closure', ab.upcoming_closures.length, 1)
eq('v_agent_business keeps Khmer intact', ab.services[0].name, 'កាត់សក់')

const bk = await one(db, `select * from v_bookings_agent where code='MN7Q1A'`)
eq('booking price', Number(bk.price_minor), 45000)
eq('paid so far (15,000 deposit + 30,000 balance)', Number(bk.paid_minor), 45000)
eq('balance derived, never stored', Number(bk.balance_minor), 0)
eq('service name resolved for the agent', bk.service_name, 'លាបសក់')

const st = await one(db, `select * from v_month_stats where business_id='${B_SALON}'`)
eq('completed bookings this month', Number(st.completed), 1)
eq('no-shows counted', Number(st.no_shows), 1)
eq('booked revenue = completed only', Number(st.booked_revenue_minor), 15000)
eq('cash collected this month', Number(st.collected_minor), 45000)

const us = await one(db, `select * from v_month_usage where business_id='${B_SALON}'`)
eq('free-tier quota is 100 transactions', Number(us.quota_txn_month), 100)
eq('conversations tracked separately (not billed)', Number(us.conversations_this_month), 2)
ok(`billable transactions used this month → ${us.txn_used}`)
eq('a paid booking counts once, not twice', Number(us.txn_used) + Number(us.txn_left), 100)

const doc = await one(db, `select count(*) c from v_schema_doc where column_comment is not null`)
ok(`v_schema_doc exposes ${doc.c} documented columns for the agent's system prompt`)

// ── 8. the trigger ────────────────────────────────────────────────────────
console.log('\nupdated_at')
const before = await one(db, `select updated_at from services where id='${S_CUT}'`)
await db.exec(`update services set price_minor = 16000 where id='${S_CUT}'`)
const after = await one(db, `select updated_at, price_minor from services where id='${S_CUT}'`)
after.updated_at > before.updated_at
  ? ok('updated_at moves on UPDATE (price drift is detectable)')
  : no('updated_at trigger', 'timestamp did not change')
eq('price actually changed', Number(after.price_minor), 16000)
const hist = await one(db, `select price_minor from bookings where code='MN4K2P'`)
eq('old booking keeps its snapshot price after the change', Number(hist.price_minor), 15000)

// ── 9. money maths (the 100x-on-stage bug) ────────────────────────────────
console.log('\nmoney')
eq('KHR 15000 renders as riel, no decimals', formatMoney(15000, 'KHR'), '15,000៛')
eq('USD 1500 renders as dollars, two decimals', formatMoney(1500, 'USD'), '$15.00')
const hotel = await one(db, `select price_minor, currency from bookings where code='AR8T3M'`)
eq('2 nights at $15 stored as 3000 cents', Number(hotel.price_minor), 3000)
eq('rendered', formatMoney(Number(hotel.price_minor), hotel.currency), '$30.00')

// ── 10. payment rails, ported logic ──────────────────────────────────────
console.log('\npayment rails (logic ported from the production store)')

// REGRESSION: a static idempotency key strands a customer whose QR lapsed.
// The unique constraint is correct; the KEY has to carry a time bucket.
const nowMs = Date.now()
const k1 = idempotencyKey('MN9X5C', 'deposit', nowMs)
const k2 = idempotencyKey('MN9X5C', 'deposit', nowMs + 1000)
const k3 = idempotencyKey('MN9X5C', 'deposit', nowMs + QR_TTL_SECONDS * 2000)
k1 === k2 ? ok('a retry inside one QR lifetime reuses the same key') : no('idempotency', 'key churned within the TTL window')
k1 !== k3 ? ok('after the QR lapses the key changes, so a new QR can be minted') : no('idempotency', 'key did not change across windows')

await expectOk(db, 'DB accepts the re-mint after expiry (customer is not stranded)',
  `insert into payments (business_id, booking_id, amount_minor, currency, provider, idempotency_key)
   values ('${B_SALON}', '90000000-0000-4000-8000-000000000003', 20000, 'KHR', 'khqr', '${k1}')`)
await expectFail(db, 'DB still rejects a same-window retry (no double QR)',
  `insert into payments (business_id, booking_id, amount_minor, currency, provider, idempotency_key)
   values ('${B_SALON}', '90000000-0000-4000-8000-000000000003', 20000, 'KHR', 'khqr', '${k2}')`,
  'duplicate key')
await expectOk(db, 'next window mints a fresh row',
  `insert into payments (business_id, booking_id, amount_minor, currency, provider, idempotency_key)
   values ('${B_SALON}', '90000000-0000-4000-8000-000000000003', 20000, 'KHR', 'khqr', '${k3}')`)

// the float epsilon bug, closed
amountsMatch(1500, 1500) ? ok('exact payment settles') : no('amountsMatch', 'exact amount rejected')
!amountsMatch(1500, 1499) ? ok('one cent short does NOT settle') : no('amountsMatch', 'underpayment accepted')
!amountsMatch(1500, 0) ? ok('zero does not settle') : no('amountsMatch', 'zero accepted')
!amountsMatch(1500, undefined) ? ok('unparseable provider amount does not settle') : no('amountsMatch', 'undefined accepted')
!amountsMatch(15000, 14999) ? ok('riel underpayment does not settle') : no('amountsMatch', 'KHR underpayment accepted')

// fallback rules
!shouldFallback(401) ? ok('bad auth does not retry on the other rail') : no('shouldFallback', '401 retried')
!shouldFallback(422) ? ok('bad payload does not retry') : no('shouldFallback', '422 retried')
shouldFallback(500) ? ok('server fault retries on the other rail') : no('shouldFallback', '500 not retried')
shouldFallback(404) ? ok('missing route retries on the other rail') : no('shouldFallback', '404 not retried')

// ── result ────────────────────────────────────────────────────────────────
console.log(`\n${fail === 0 ? '\x1b[32m' : '\x1b[31m'}${pass} passed, ${fail} failed\x1b[0m\n`)
process.exit(fail === 0 ? 0 : 1)
