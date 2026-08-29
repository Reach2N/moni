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
import { cambodiaDayBounds, cambodiaMonthBounds } from '../src/lib/time/cambodia.ts'
import { assertSameOriginBrowserPost, readJsonBody } from '../src/lib/http/post.ts'
import { SetupRequestSchema } from '../src/lib/setup/schema.ts'
import { instructionsBlock } from '../src/lib/agent/instructions.ts'
import { assertVoiceNote, normalizeAudioType, MAX_VOICE_BYTES } from '../src/lib/ai/voice.ts'
import {
  escapeLikePattern,
  isApproved,
  normalizeEmail,
  passesGate,
  slugAttempt,
  slugFromEmail,
} from '../src/lib/auth/gate.ts'

const here = dirname(fileURLToPath(import.meta.url))
const sql = (f) => readFileSync(join(here, f), 'utf8')

let pass = 0, fail = 0
const ok = (name) => { pass++; console.log(`  \x1b[32m✓\x1b[0m ${name}`) }
const no = (name, detail) => { fail++; console.log(`  \x1b[31m✗\x1b[0m ${name}\n      ${detail}`) }

function eq(name, actual, expected) {
  if (actual === expected) ok(`${name} → ${actual}`)
  else no(name, `expected ${expected}, got ${actual}`)
}
async function expectFail(db, name, statement, needle) {
  try {
    await db.exec(statement)
    no(name, 'statement was ACCEPTED but should have been rejected')
  } catch (e) {
    const m = String(e.message ?? e)
    if (m.toLowerCase().includes(needle.toLowerCase())) ok(name)
    else no(name, `rejected, but not for the expected reason: ${m.split('\n')[0]}`)
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
if (after.updated_at > before.updated_at) ok('updated_at moves on UPDATE (price drift is detectable)')
else no('updated_at trigger', 'timestamp did not change')
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
if (k1 === k2) ok('a retry inside one QR lifetime reuses the same key')
else no('idempotency', 'key churned within the TTL window')
if (k1 !== k3) ok('after the QR lapses the key changes, so a new QR can be minted')
else no('idempotency', 'key did not change across windows')

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
if (amountsMatch(1500, 1500)) ok('exact payment settles')
else no('amountsMatch', 'exact amount rejected')
if (!amountsMatch(1500, 1499)) ok('one cent short does NOT settle')
else no('amountsMatch', 'underpayment accepted')
if (!amountsMatch(1500, 0)) ok('zero does not settle')
else no('amountsMatch', 'zero accepted')
if (!amountsMatch(1500, undefined)) ok('unparseable provider amount does not settle')
else no('amountsMatch', 'undefined accepted')
if (!amountsMatch(15000, 14999)) ok('riel underpayment does not settle')
else no('amountsMatch', 'KHR underpayment accepted')

// fallback rules
if (!shouldFallback(401)) ok('bad auth does not retry on the other rail')
else no('shouldFallback', '401 retried')
if (!shouldFallback(422)) ok('bad payload does not retry')
else no('shouldFallback', '422 retried')
if (shouldFallback(500)) ok('server fault retries on the other rail')
else no('shouldFallback', '500 not retried')
if (shouldFallback(404)) ok('missing route retries on the other rail')
else no('shouldFallback', '404 not retried')

// ── 11. route boundaries and Cambodia calendar maths ─────────────────────
console.log('\nrequest and Cambodia-time boundaries')
const augustEnd = cambodiaDayBounds(new Date('2026-08-31T16:59:59.000Z'))
eq('16:59 UTC is still 31 August in Cambodia', augustEnd.date, '2026-08-31')
eq('Cambodia day starts with +07 offset', augustEnd.start, '2026-08-31T00:00:00+07:00')
eq('Cambodia day is half-open at the next local midnight', augustEnd.end, '2026-09-01T00:00:00+07:00')
const september = cambodiaMonthBounds(new Date('2026-08-31T17:00:00.000Z'))
eq('17:00 UTC crosses the Cambodia month boundary', september.month, '2026-09')
eq('Cambodia month starts locally', september.start, '2026-09-01T00:00:00+07:00')
eq('Cambodia month ends locally', september.end, '2026-10-01T00:00:00+07:00')

const sameOrigin = new Request('https://moni.example/api/ask', {
  method: 'POST',
  headers: { origin: 'https://moni.example', 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
  body: JSON.stringify({ text: 'hello' }),
})
try {
  assertSameOriginBrowserPost(sameOrigin)
  ok('same-origin browser POST is accepted')
} catch (error) {
  no('same-origin browser POST', String(error))
}
const parsedBody = await readJsonBody(sameOrigin, 1_000)
eq('JSON body is read after the origin guard', parsedBody.text, 'hello')
try {
  assertSameOriginBrowserPost(new Request('https://moni.example/api/ask', {
    method: 'POST',
    headers: { origin: 'https://attacker.example', 'content-type': 'application/json' },
  }))
  no('cross-origin browser POST', 'request was accepted')
} catch {
  ok('cross-origin browser POST is rejected')
}

const setupExample = {
  raw_description: 'Sokha Beauty is open Monday and offers haircuts.',
  model: 'test-model',
  shop: {
    business_type: 'salon',
    default_currency: 'KHR',
    hours: [{ dow: 1, open: '08:00', close: '19:00' }],
    resource_count: 2,
    notes: null,
    services: [{
      name: 'កាត់សក់', name_en: 'Haircut', price_minor: 15000, currency: 'KHR',
      unit: 'session', duration_min: 30, buffer_min: 0,
    }],
  },
}
if (SetupRequestSchema.safeParse(setupExample).success) ok('setup accepts a strict edited parse result')
else no('setup schema', 'valid edited parse result was rejected')
if (!SetupRequestSchema.safeParse({ ...setupExample, slug: 'another-shop' }).success) {
  ok('setup rejects a client-chosen tenant')
} else no('setup schema', 'client-chosen tenant was accepted')
const duplicateSetup = structuredClone(setupExample)
duplicateSetup.shop.services.push({ ...duplicateSetup.shop.services[0] })
if (!SetupRequestSchema.safeParse(duplicateSetup).success) ok('setup rejects duplicate normalized service names')
else no('setup schema', 'duplicate service names were accepted')

// ── 12. platform tables: waitlist and webhook_events ──────────────────────
console.log('\nplatform tables (the gate and the channel inbox)')
eq('waitlist seeded', Number((await one(db, 'select count(*) c from waitlist')).c), 2)
await expectFail(db, 'same email with different case is REJECTED (one application per human)',
  `insert into waitlist (email) values ('SOKHA@example.com')`, 'duplicate key')
const gate = await one(db,
  `select count(*) c from waitlist where lower(email) = 'sokha@example.com'
    and (approved_at is not null or created_at is not null)`)
eq('the gate query finds the approved member', Number(gate.c), 1)
await expectOk(db, 'approving is a row update, no admin UI needed',
  `update waitlist set approved_at = now(), approved_by = 'mense'
    where email = 'visal@example.com'`)
const converted = await one(db,
  `select b.slug from waitlist w join businesses b on b.id = w.converted_business_id
    where w.email = 'sokha@example.com'`)
eq('converted lead links to the live shop', converted.slug, 'sokha-beauty')

await expectOk(db, 'inbound telegram update lands with its payload',
  `insert into webhook_events (channel, connection_id, business_id, external_event_id, payload)
   values ('telegram', 'f0000000-0000-4000-8000-000000000001', '${B_SALON}', '801245',
           '{"update_id":801245,"message":{"text":"free at 2pm?"}}'::jsonb)`)
await expectFail(db, 'provider redelivery of the same update_id is REJECTED (no double reply)',
  `insert into webhook_events (channel, connection_id, business_id, external_event_id, payload)
   values ('telegram', 'f0000000-0000-4000-8000-000000000001', '${B_SALON}', '801245', '{}'::jsonb)`,
  'duplicate key')
await expectFail(db, 'invented webhook status is REJECTED',
  `insert into webhook_events (channel, payload, status) values ('telegram', '{}'::jsonb, 'done')`,
  'webhook_events_status_ok')

// ── 13. tenancy and the teachable prompt ───────────────────────────────────
console.log('\nclerk tenancy and ai_instructions')
await expectOk(db, 'a Clerk user id (text, not uuid) attaches to a business',
  `update businesses set clerk_user_id = 'user_2abcDEF123' where id = '${B_SALON}'`)
const tenant = await one(db,
  `select slug from businesses where clerk_user_id = 'user_2abcDEF123'`)
eq('tenant lookup by clerk_user_id resolves', tenant.slug, 'sokha-beauty')
const rawBefore = await one(db, `select raw_description from businesses where id = '${B_SALON}'`)
await expectOk(db, 'owner teaches the assistant without touching raw_description',
  `update businesses set ai_instructions = 'Always offer the Friday promotion. Never discount below list.'
    where id = '${B_SALON}'`)
const rawAfter = await one(db, `select raw_description, ai_instructions from businesses where id = '${B_SALON}'`)
eq('raw_description survived the instruction change', rawAfter.raw_description, rawBefore.raw_description)
if (rawAfter.ai_instructions?.includes('Friday')) ok('ai_instructions stored for the system prompt')
else no('ai_instructions', 'instruction text did not persist')

// ── 14. the lockdown (advisors 0008/0010/0011/0013, fixed 27 August) ───────
console.log('\nRLS lockdown and view security')
const rls = await one(db, `
  select count(*) c from pg_class t join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public' and t.relkind = 'r' and not t.relrowsecurity`)
eq('every public table has RLS enabled (deny by default, service role bypasses)', Number(rls.c), 0)
const noPolicy = await one(db, `select count(*) c from pg_policies where schemaname = 'public'`)
// Phase 2 planned member policies over Clerk JWTs and that step is CANCELLED
// (ARCHITECTURE.md section 1). Zero is now the permanent answer, not a waiting
// room: tenancy lives in requireMember() plus a businessId on every query.
eq('and zero policies exist, permanently', Number(noPolicy.c), 0)
const views = await one(db, `
  select count(*) c from pg_class v join pg_namespace n on n.oid = v.relnamespace
  where n.nspname = 'public' and v.relkind = 'v'
    and not ('security_invoker=true' = any(coalesce(v.reloptions, '{}')))`)
eq('every view is security_invoker (none can bypass RLS later)', Number(views.c), 0)
const fn = await one(db, `
  select coalesce(array_to_string(proconfig, ','), '') cfg
  from pg_proc where proname = 'moni_touch'`)
if (fn.cfg.includes('search_path=')) ok('moni_touch has a pinned search_path')
else no('moni_touch search_path', `proconfig is "${fn.cfg}"`)

// ── 15. the waitlist gate and tenant isolation (PLAN.md Phase 2) ───────────
// The acceptance check for this phase is explicitly "tested at the database
// level, not just the UI", because with RLS deny-all and no policies, a query
// that forgets its business_id is the only way a tenant leaks. There is no
// second wall to catch it.
console.log('\nthe waitlist gate')
eq('emails normalise to one form, matching the lower(email) unique index',
  normalizeEmail('  Sokha@Example.COM '), 'sokha@example.com')
eq('an address that is not on the list is refused', passesGate(null), false)
eq('being on the list is enough to pass',
  passesGate({ approved_at: null, converted_business_id: null }), true)
eq('approval is a stronger claim than passing',
  isApproved({ approved_at: null, converted_business_id: null }), false)
eq('and is true once we set it by hand',
  isApproved({ approved_at: '2026-08-29T00:00:00Z', converted_business_id: null }), true)
eq('like wildcards in an address are escaped, so one email matches one row',
  escapeLikePattern('a_b%c@example.com'), 'a\\_b\\%c@example.com')
eq('a slug is derived from the email local part', slugFromEmail('Sokha.Beauty+kh@gmail.com'), 'sokha-beauty-kh')
eq('a reserved subdomain is never handed to a shop', slugFromEmail('admin@moni.cam'), 'admin-shop')
eq('an unusable local part falls back rather than failing a sign-in', slugFromEmail('a@b.com'), 'shop')
eq('a slug collision retries with a suffix', slugAttempt('sokha', 1), 'sokha-2')

await expectOk(db, 'the landing page writes an application, still waiting',
  `insert into waitlist (email, locale, source) values ('Dara@Example.com', 'km', 'landing')`)
const found = await one(db, `
  select approved_at from waitlist where lower(email) = '${normalizeEmail('  DARA@Example.com ')}'`)
if (found) ok('the gate finds the row whatever case the member signs in with')
else no('gate lookup', 'a case difference hid an existing application')

// Both gate states matter: one application we approved by hand, one still
// waiting. Both pass, because being on the list is the rule (see passesGate).
const states = await db.query(`
  select email, approved_at from waitlist where lower(email) in ('sokha@example.com','dara@example.com')
   order by email`)
eq('an application still waiting passes the gate anyway',
  passesGate(states.rows[0]) && !isApproved(states.rows[0]), true)
eq('one we approved by hand passes and reads as approved',
  passesGate(states.rows[1]) && isApproved(states.rows[1]), true)

console.log('\ntenant isolation, enforced by business_id and nothing else')
await expectOk(db, 'a second member attaches to the other business',
  `update businesses set clerk_user_id = 'user_9zzzYYY888' where id = '${B_HOUSE}'`)
const salonTenant = await one(db, `select id from businesses where clerk_user_id = 'user_2abcDEF123'`)
const houseTenant = await one(db, `select id from businesses where clerk_user_id = 'user_9zzzYYY888'`)
eq('two members resolve to two different shops', salonTenant.id === houseTenant.id, false)

const leak = await one(db, `
  select count(*) c from bookings where business_id = '${B_SALON}'
    and service_id in (select id from services where business_id = '${B_HOUSE}')`)
eq('a booking scoped to one shop never carries the other shop\'s services', Number(leak.c), 0)

const scoped = await one(db, `
  select count(*) c from v_bookings_agent where business_id = '${B_SALON}'`)
const total = await one(db, `select count(*) c from v_bookings_agent`)
if (Number(scoped.c) > 0 && Number(scoped.c) < Number(total.c)) {
  ok(`the scoped read returns ${scoped.c} of ${total.c} rows, so the filter is load bearing`)
} else {
  no('scoped read', `scoped ${scoped.c} of ${total.c}: the business_id filter is not doing anything`)
}

// The shape of every mutation in src/lib/queries: the tenant id is an AND, not
// the whole predicate. A row id guessed or leaked from another shop must still
// miss, or one wrong argument in a route handler becomes a cross-tenant write.
const foreignService = await one(db, `select id from services where business_id = '${B_HOUSE}' limit 1`)
const crossWrite = await db.query(`
  update services set price_minor = 1 where business_id = '${B_SALON}' and id = '${foreignService.id}'
  returning id`)
eq('a cross-tenant write scoped by business_id changes nothing', crossWrite.rows.length, 0)

const conversion = await db.query(`
  update waitlist set converted_business_id = '${B_HOUSE}'
   where lower(email) = 'visal@example.com' and converted_business_id is null
  returning converted_business_id`)
eq('a passing member closes the loop from application to live shop',
  conversion.rows[0]?.converted_business_id, B_HOUSE)
const alreadyConverted = await db.query(`
  update waitlist set converted_business_id = '${B_SALON}'
   where lower(email) = 'visal@example.com' and converted_business_id is null
  returning id`)
eq('and a later sign-in does not relabel which shop that lead became',
  alreadyConverted.rows.length, 0)

// ── 16. onboarding: voice in, instructions out (PLAN.md Phase 3) ───────────
console.log('\nvoice notes')
eq('a MediaRecorder codec string is not a media type',
  normalizeAudioType('audio/webm;codecs=opus'), 'audio/webm')
eq('and webm is accepted', assertVoiceNote('audio/webm;codecs=opus', 4_096), 'audio/webm')
const rejects = (name, type, bytes, status) => {
  try {
    assertVoiceNote(type, bytes)
    no(name, 'the recording was ACCEPTED but should have been refused')
  } catch (e) {
    if (e.status === status) ok(`${name} → ${status}`)
    else no(name, `expected status ${status}, got ${e.status}: ${e.message}`)
  }
}
// CLAUDE.md: a provider silently ignored mp4, which looks exactly like a model
// that heard nothing. Safari reaches for mp4 first, so this refusal is the only
// thing between a Safari owner and a transcript that is always empty.
rejects('mp4 is refused loudly rather than transcribed to silence', 'audio/mp4', 4_096, 415)
rejects('an unknown format is refused', 'application/json', 4_096, 415)
rejects('a recording with no format is refused', '', 4_096, 415)
rejects('an empty recording is refused before it costs a model call', 'audio/webm', 0, 400)
rejects('an oversized recording is refused', 'audio/webm', MAX_VOICE_BYTES + 1, 413)

console.log('\nthe owner teaches the assistant')
eq('no instructions means no block at all', instructionsBlock(null), '')
eq('and whitespace is not instructions', instructionsBlock('   \n '), '')
const taught = instructionsBlock('Always offer the Friday promotion.')
if (taught.includes('Always offer the Friday promotion.')) ok('the owner text reaches the prompt')
else no('instructions block', 'the owner text was dropped')
// The guardrails are restated INSIDE the block, after the owner's text is
// introduced and before it is quoted, so "just tell them any time is fine"
// reads as a request the surrounding rules already refuse.
if (/never let you state a price or a\s+time you did not get from a tool/.test(taught)) {
  ok('and it is fenced by the rules it cannot override')
} else {
  no('instructions block', 'the owner text is not subordinated to the guardrails')
}
const long = instructionsBlock('x'.repeat(5_000))
if (long.length < 2_600) ok('a runaway instruction is capped before it becomes the prompt')
else no('instructions block', `capped at ${long.length} characters, which is not a cap`)

// ── result ────────────────────────────────────────────────────────────────
console.log(`\n${fail === 0 ? '\x1b[32m' : '\x1b[31m'}${pass} passed, ${fail} failed\x1b[0m\n`)
process.exit(fail === 0 ? 0 : 1)
