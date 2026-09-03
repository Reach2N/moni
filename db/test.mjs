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
import { createHmac } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { formatMoney, BILLABLE_BOOKING_STATUSES, BUSINESS_TYPES, sellsFor, catalogKindFor, BOOKING_UNITS } from '../src/lib/types.ts'
import { amountsMatch, idempotencyKey, shouldFallback, QR_TTL_SECONDS } from '../src/lib/payments.ts'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { cambodiaDayBounds, cambodiaMonthBounds } from '../src/lib/time/cambodia.ts'
import { assertSameOriginBrowserPost, readJsonBody } from '../src/lib/http/post.ts'
import { SetupRequestSchema } from '../src/lib/setup/schema.ts'
import { planCatalogue } from '../src/lib/setup/plan.ts'
import { instructionsBlock } from '../src/lib/agent/instructions.ts'
import { decryptSecret, encryptSecret, newWebhookSecret, secretsMatch } from '../src/lib/crypto/secrets.ts'
import { extractIncoming, looksLikeBotToken } from '../src/lib/channels/telegram.ts'
import { scopedExternalId } from '../src/lib/agent/identity.ts'
import { describeTurn } from '../src/lib/agent/trace.ts'
import { sortInbox } from '../src/lib/queries/inbox-order.ts'
import { checkBudget, formatSpend, DEFAULT_CONVERSATION_CAP_MICRO_USD, DEFAULT_MONTH_CEILING_MICRO_USD } from '../src/lib/ops/budget.ts'
import { createRateLimiter } from '../src/lib/ops/rate-limit.ts'
import { shopSlugFromHost } from '../src/lib/hosting/subdomain.ts'
import { sanityCheck, isOnlyHeadlineIsShopName, preferRetry } from '../src/lib/ai/storefront-check.ts'
import { catalogueCounts, catalogueZeroKind } from '../src/lib/setup/catalogue-count.ts'
import { buildKhqrPayload, crc16, amountField, khqrMd5 } from '../src/lib/khqr/payload.ts'
import { assertUploadable, storageKey, MediaError, MAX_IMAGE_BYTES } from '../src/lib/media/validate.ts'
import { shopKhqrRail, isPollable } from '../src/lib/payments/shop-khqr.ts'
import { KHQR_ACCOUNT_ID, paymentAccountFor } from '../src/lib/types.ts'
import { createOrder, allocateInvoiceNumber, OrderError } from '../src/lib/orders/create.ts'
import { expireWebOrders, findExpiredWebOrders } from '../src/lib/orders/expire.ts'
import { orderErrorKm, orderErrorStatus } from '../src/lib/orders/messages.ts'
import { confirmTarget } from '../src/lib/payments/confirm-target.ts'
import { publishedShopFrom } from '../src/lib/storefront/published.ts'
import { KHQR, CURRENCY, TAG } from 'ts-khqr'
import {
  expectedSignature, isFulfillingEvent, parseSignatureHeader,
  statusFromEvent, verifyCutluyDelivery, withinReplayWindow,
} from '../src/lib/payments/cutluy-webhook.ts'
import { THEMES, WARMTHS, VOICES, DENSITIES, DEFAULT_VIBE, vibeOf } from '../src/lib/types.ts'
import { candidateSeeds, contrastRatio, isSeed, mulberry32, paletteFor, styleFor } from '../src/lib/storefront/style.ts'
import { TILE_PATTERNS, ROTATIONS_FOR, tileFor, patternGeometry, shouldDrawTile } from '../src/lib/media/tile.ts'
import { extractMessengerMessages, verifySignature } from '../src/lib/channels/messenger.ts'
import { assertVoiceNote, normalizeAudioType, MAX_VOICE_BYTES } from '../src/lib/ai/voice.ts'
import { movePlan } from '../src/lib/catalogue/backfill.ts'
import { calendarsFor, toCalendarEvents } from '../src/lib/calendar/events.ts'
import { askSuggestions } from '../src/lib/agent/suggestions.ts'
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
// db/seed.sql's own cafe, walk-in menu only. Not the same fixture as the
// ad hoc 'test-cafe' business created further down for the photo and
// storefront checks (a different id): that one is scaffolding built inline
// for those specific assertions, this one is seed data every developer sees.
const B_COFFEE = 'b0000000-0000-4000-8000-000000000003'
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
eq('businesses seeded', Number((await one(db, 'select count(*) c from businesses')).c), 3)
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
          '${o.status ?? 'confirmed'}','${o.unit ?? 'session'}',${o.price ?? 375},'USD','web','ai'
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
   values ('${B_SALON}', 375, 'USD', 'khqr', 'booking:90000000-0000-4000-8000-000000000002:deposit')`,
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
   values ('${B_SALON}','90000000-0000-4000-8000-000000000002', 750, 'USD', 'cash', 'balance', 'paid', now(),
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
eq('booking price', Number(bk.price_minor), 1125)
eq('paid so far ($3.75 deposit + $7.50 balance)', Number(bk.paid_minor), 1125)
eq('balance derived, never stored', Number(bk.balance_minor), 0)
eq('service name resolved for the agent', bk.service_name, 'លាបសក់')

const st = await one(db, `select * from v_month_stats where business_id='${B_SALON}'`)
eq('completed bookings this month', Number(st.completed), 1)
eq('no-shows counted', Number(st.no_shows), 1)
eq('booked revenue = completed only', Number(st.booked_revenue_minor), 375)
eq('cash collected this month', Number(st.collected_minor), 1125)

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
eq('old booking keeps its snapshot price after the change', Number(hist.price_minor), 375)

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

// ── 17. Telegram: the channel, the secret, and the retry (PLAN.md Phase 4) ──
console.log('\nchannel credentials')
// A key of the wrong length is a configuration mistake, and it must fail at the
// point of encryption rather than produce a row nothing can ever decrypt.
const KEY_A = Buffer.alloc(32, 7)
const KEY_B = Buffer.alloc(32, 9)
const cipher = encryptSecret('123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw', KEY_A)
if (!cipher.includes('123456789')) ok('a bot token is not readable in the stored value')
else no('encryptSecret', 'the token appears in the ciphertext')
eq('and it round trips', decryptSecret(cipher, KEY_A).startsWith('123456789:'), true)
const wrongKey = (() => {
  try { decryptSecret(cipher, KEY_B); return 'DECRYPTED' } catch { return 'refused' }
})()
eq('the wrong key cannot read it', wrongKey, 'refused')
// GCM authenticates, so a row edited in the database fails instead of decrypting
// to something else. This is the difference between GCM and CBC, and the reason
// schema.sql specifies it.
const parts = cipher.split('.')
const flipped = Buffer.from(parts[2], 'base64')
flipped[0] ^= 0xff
const tampered = (() => {
  try { decryptSecret([parts[0], parts[1], flipped.toString('base64'), parts[3]].join('.'), KEY_A); return 'DECRYPTED' }
  catch { return 'refused' }
})()
eq('a tampered ciphertext is refused, not silently altered', tampered, 'refused')
eq('a secret matches itself', secretsMatch('abc', 'abc'), true)
eq('and does not match a prefix of itself', secretsMatch('abc', 'ab'), false)
eq('an absent secret never matches', secretsMatch(null, 'abc'), false)
// Telegram allows A-Z a-z 0-9 _ and - in secret_token, and nothing else.
if (/^[A-Za-z0-9_-]{40,}$/.test(newWebhookSecret())) ok('a webhook secret is URL safe and long')
else no('newWebhookSecret', `got ${newWebhookSecret()}`)

console.log('\nTelegram updates')
eq('a BotFather token is recognised', looksLikeBotToken('123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw'), true)
eq('half a paste is not', looksLikeBotToken('123456789:AAHdqTcv'), false)
eq('and neither is a stray sentence', looksLikeBotToken('my bot token'), false)
const textUpdate = {
  update_id: 7001,
  message: { message_id: 1, date: 0, chat: { id: 555, type: 'private' },
    from: { id: 555, is_bot: false, first_name: 'ដារ៉ា' }, text: 'ស្អែកម៉ោង ១០ បានទេ?' },
}
const incoming = extractIncoming(textUpdate)
eq('a customer message is extracted', incoming?.text, 'ស្អែកម៉ោង ១០ បានទេ?')
eq('and carries the Telegram user id, not the chat id, as identity', incoming?.fromId, 555)
eq('a name is kept in Khmer script', incoming?.displayName, 'ដារ៉ា')
eq('another bot is ignored rather than answered',
  extractIncoming({ ...textUpdate, message: { ...textUpdate.message, from: { id: 9, is_bot: true, first_name: 'b' } } }), null)
eq('a sticker is ignored rather than answered',
  extractIncoming({ update_id: 2, message: { message_id: 1, date: 0, chat: { id: 5, type: 'private' }, from: { id: 5, is_bot: false, first_name: 'a' } } }), null)

console.log('\ntwo shops on one channel')
// The identity table is unique on (channel, external_id) globally, so the tenant
// has to be in the key. Without this, one Telegram user messaging two shops
// collapses into a single customer row and each shop reads the other's thread.
const idA = scopedExternalId(B_SALON, 555)
const idB = scopedExternalId(B_HOUSE, 555)
eq('the same Telegram user is a different customer at a different shop', idA === idB, false)
await expectOk(db, 'the salon can record that Telegram customer',
  `insert into customers (id, business_id, display_name) values ('d0000000-0000-4000-8000-0000000000a1','${B_SALON}','ដារ៉ា');
   insert into customer_identities (customer_id, channel, external_id)
     values ('d0000000-0000-4000-8000-0000000000a1','telegram','${idA}')`)
await expectOk(db, 'and the guesthouse can record the same person separately',
  `insert into customers (id, business_id, display_name) values ('d0000000-0000-4000-8000-0000000000a2','${B_HOUSE}','ដារ៉ា');
   insert into customer_identities (customer_id, channel, external_id)
     values ('d0000000-0000-4000-8000-0000000000a2','telegram','${idB}')`)
await expectFail(db, 'while the same identity twice is still refused',
  `insert into customer_identities (customer_id, channel, external_id)
     values ('d0000000-0000-4000-8000-0000000000a2','telegram','${idA}')`,
  'customer_identities_channel_external_id_key')

console.log('\nwebhook delivery')
await expectOk(db, 'a shop connects one Telegram bot',
  `insert into channel_connections (id, business_id, channel, external_id, display_name, token_ciphertext, webhook_secret, status)
   values ('c0000000-0000-4000-8000-0000000000f1','${B_SALON}','telegram','8899','@sokha_bot','${cipher}','s3cr3t','connected')
   on conflict (business_id, channel) do update set status = 'connected'`)
await expectFail(db, 'and cannot connect a second one to the same channel',
  `insert into channel_connections (business_id, channel, display_name) values ('${B_SALON}','telegram','@other_bot')`,
  'channel_connections_business_id_channel_key')
const conn = await one(db, `select id from channel_connections where business_id = '${B_SALON}' and channel = 'telegram'`)
await expectOk(db, 'an update is logged before the agent runs',
  `insert into webhook_events (channel, connection_id, business_id, external_event_id, payload)
   values ('telegram','${conn.id}','${B_SALON}','7001','{"update_id":7001}'::jsonb)`)
// Telegram redelivers when we answer slowly, and the agent can book. The dedupe
// index is what stops one customer message becoming two bookings.
await expectFail(db, 'a redelivery of the same update is refused, so nobody is booked twice',
  `insert into webhook_events (channel, connection_id, business_id, external_event_id, payload)
   values ('telegram','${conn.id}','${B_SALON}','7001','{"update_id":7001}'::jsonb)`,
  'webhook_events_dedupe')
await expectOk(db, 'and a settled event leaves the pending queue',
  `update webhook_events set status = 'processed', processed_at = now()
    where connection_id = '${conn.id}' and external_event_id = '7001'`)
const settled = await one(db, `
  select status, processed_at is not null done from webhook_events
   where connection_id = '${conn.id}' and external_event_id = '7001'`)
eq('the delivery is recorded as handled', settled.status, 'processed')
eq('with the time it was handled', settled.done, true)

// ── 18. the dashboard: live cursor and inbox order (PLAN.md Phase 5) ───────
console.log('\nthe live dashboard')
// The SSE route polls `updated_at > cursor`, so the acceptance check ("appears
// without a refresh in under two seconds") rests entirely on this column moving
// when a booking changes, and on the view exposing it.
const viewHasCursor = await one(db, `
  select count(*) c from information_schema.columns
   where table_name = 'v_bookings_agent' and column_name = 'updated_at'`)
eq('the bookings view exposes the cursor the stream polls', Number(viewHasCursor.c), 1)
// Pinned by id, not by `order by created_at limit 1`: the seed inserts every
// booking in one statement, so created_at ties and that ordering picks a
// different row each time you ask.
const touchTarget = await one(db, `select id, updated_at from bookings where business_id = '${B_SALON}' limit 1`)
const beforeTouch = touchTarget
await new Promise((r) => setTimeout(r, 20))
await expectOk(db, 'confirming a booking moves the cursor',
  `update bookings set status = 'confirmed' where id = '${touchTarget.id}'`)
const afterTouch = await one(db, `select updated_at from bookings where id = '${touchTarget.id}'`)
eq('so the open dashboard sees it on the next tick',
  new Date(afterTouch.updated_at) > new Date(beforeTouch.updated_at), true)
const streamed = await one(db, `
  select count(*) c from v_bookings_agent
   where business_id = '${B_SALON}' and updated_at > '${beforeTouch.updated_at.toISOString()}'`)
if (Number(streamed.c) >= 1) ok(`the cursor query returns the changed row (${streamed.c})`)
else no('stream cursor', 'a confirmed booking did not come back from the cursor query')

console.log('\ninbox order')
const unsorted = [
  { status: 'open', lastMessageAt: '2026-08-30T10:00:00Z' },
  { status: 'needs_owner', lastMessageAt: '2026-08-29T08:00:00Z' },
  { status: 'open', lastMessageAt: '2026-08-30T12:00:00Z' },
  { status: 'needs_owner', lastMessageAt: '2026-08-30T09:00:00Z' },
]
const sorted = sortInbox(unsorted)
// Escalations first even when they are older: they are the only rows that need
// the owner at all, and a shop owner scrolling to find one has already lost.
eq('the oldest escalation still outranks the newest handled thread',
  sorted[0].status === 'needs_owner' && sorted[1].status === 'needs_owner', true)
eq('and escalations are newest first among themselves',
  sorted[0].lastMessageAt, '2026-08-30T09:00:00Z')
eq('with the rest newest first below them', sorted[2].lastMessageAt, '2026-08-30T12:00:00Z')
eq('sorting does not mutate the caller\'s array', unsorted[0].status, 'open')

// ── 19. Messenger: signature and envelope (PLAN.md Phase 6) ────────────────
console.log('\nMessenger deliveries')
// Deliberately NOT canonical JSON: Meta signs the bytes it sent, whitespace and
// all. A payload that happens to round trip byte for byte would prove nothing.
const RAW = '{"object": "page", "entry": [{"id": "777", "messaging": [{"sender": {"id": "42"}, "message": {"mid": "m1", "text": "តម្លៃកាត់សក់ប៉ុន្មាន?"}}]}]}'
const APP_SECRET = 'meta-app-secret'
const goodSig = 'sha256=' + createHmac('sha256', APP_SECRET).update(RAW, 'utf8').digest('hex')
eq('a Meta signature over the RAW body verifies', verifySignature(RAW, goodSig, APP_SECRET), true)
// Re-serialising parsed JSON changes the bytes. This is the bug that costs an
// afternoon, so it is asserted rather than remembered.
eq('the same JSON re-serialised does NOT verify',
  verifySignature(JSON.stringify(JSON.parse(RAW)), goodSig, APP_SECRET), false)
eq('a forged signature is refused', verifySignature(RAW, 'sha256=' + 'a'.repeat(64), APP_SECRET), false)
eq('an unsigned delivery is refused', verifySignature(RAW, null, APP_SECRET), false)
const messages = extractMessengerMessages(JSON.parse(RAW))
eq('one customer message is extracted', messages.length, 1)
eq('with the page id, which is how the shop is resolved', messages[0].pageId, '777')
eq('and Meta\'s own message id, which is the dedupe key', messages[0].messageId, 'm1')
// A page's own outgoing messages come back through the same webhook. Without the
// echo check the assistant answers itself, forever.
eq('the page\'s own echo is not treated as a customer message',
  extractMessengerMessages({ object: 'page', entry: [{ id: '777', messaging: [
    { sender: { id: '777' }, message: { mid: 'm2', text: 'hi', is_echo: true } }] }] }).length, 0)
eq('and a non-page payload is ignored entirely',
  extractMessengerMessages({ object: 'instagram', entry: [] }).length, 0)

// ── 20. hosted shop sites (PLAN.md Phase 7) ────────────────────────────────
console.log('\nsubdomain routing')
eq('a shop subdomain resolves to its slug', shopSlugFromHost('sokha-beauty.moni.cam'), 'sokha-beauty')
eq('and a port does not confuse it', shopSlugFromHost('sokha-beauty.localhost:3000'), 'sokha-beauty')
eq('the apex is not a shop', shopSlugFromHost('moni.cam'), null)
eq('nor is www', shopSlugFromHost('www.moni.cam'), null)
// A preview URL's first label looks exactly like a slug. Rewriting it would
// serve the whole deployment as a shop that does not exist.
eq('a Vercel preview host is never treated as a shop',
  shopSlugFromHost('moni-git-main-reach2n.vercel.app'), null)
eq('a reserved name is never a shop', shopSlugFromHost('app.moni.cam'), null)
eq('and neither is admin', shopSlugFromHost('admin.moni.cam'), null)
eq('a deeper label is refused rather than guessed', shopSlugFromHost('a.b.moni.cam'), null)
eq('an unrelated domain is ignored', shopSlugFromHost('example.com'), null)
eq('a missing host is ignored', shopSlugFromHost(null), null)
eq('and the host is matched case insensitively', shopSlugFromHost('Sokha-Beauty.Moni.Cam'), 'sokha-beauty')

console.log('\ngenerated site copy')
const goodCopy = {
  theme: 'salon', vibe: { warmth: 'warm', voice: 'crafted', density: 'standard' },
  headline: 'កាត់សក់នៅតាកែវ', subhead: 'បើករាល់ថ្ងៃ លើកលែងថ្ងៃអាទិត្យ',
  about: 'ហាងកាត់សក់តូចមួយនៅតាកែវ មានបុគ្គលិកពីរនាក់។ យើងទទួលកក់ម៉ោងតាម Telegram។',
  highlights: ['បុគ្គលិកពីរនាក់', 'កក់តាម Telegram'], callToAction: 'កក់ម៉ោង', notice: null,
}
eq('honest copy passes clean', sanityCheck(goodCopy, 'Sokha Beauty').length, 0)
// The model never emits markup, and this is the assertion that keeps it true:
// a bad generation must read badly, never render badly.
const withMarkup = { ...goodCopy, about: '<script>alert(1)</script> ហាងកាត់សក់' }
if (sanityCheck(withMarkup, 'Sokha Beauty').some((w) => w.issue.includes('markup'))) {
  ok('markup in generated copy is caught before an owner can publish it')
} else no('sanityCheck', 'markup passed the check')
// A price in prose is the 100x currency bug all over again: prices render from
// services.price_minor beside this text, so a second source of truth will drift.
const withPrice = { ...goodCopy, subhead: 'កាត់សក់ត្រឹមតែ 15000៛' }
if (sanityCheck(withPrice, 'Sokha Beauty').some((w) => w.issue.includes('price'))) {
  ok('a price written into the copy is caught')
} else no('sanityCheck', 'a price in prose passed the check')
if (sanityCheck({ ...goodCopy, headline: 'The best salon in Cambodia' }, 'Sokha Beauty')
      .some((w) => w.issue.includes('claim'))) {
  ok('a claim the owner never made is caught')
} else no('sanityCheck', 'an invented claim passed the check')
if (sanityCheck({ ...goodCopy, about: 'Open daily — closed Sunday' }, 'Sokha Beauty')
      .some((w) => w.issue.includes('em dash'))) {
  ok('an em dash is caught, because the model produces them by default')
} else no('sanityCheck', 'an em dash passed the check')
if (sanityCheck({ ...goodCopy, headline: 'Sokha Beauty' }, 'Sokha Beauty')
      .some((w) => w.issue.includes('says nothing'))) {
  ok('a headline that is only the shop name is caught')
} else no('sanityCheck', 'an empty headline passed the check')

// generateStorefront's one bounded retry fires only when this is the ENTIRE
// warning list: a headline that repeats the shop name and nothing else. Any
// other warning, alone or riding alongside it, is a fact a reroll cannot
// reliably fix (an invented claim, a price, markup), so it must not trigger.
eq('a headline-only-name warning, and only that one, is the retry trigger',
  isOnlyHeadlineIsShopName(sanityCheck({ ...goodCopy, headline: 'Sokha Beauty' }, 'Sokha Beauty')), true)
eq('honest copy has nothing to retry', isOnlyHeadlineIsShopName(sanityCheck(goodCopy, 'Sokha Beauty')), false)
eq('a second warning alongside it cancels the retry',
  isOnlyHeadlineIsShopName(
    sanityCheck({ ...goodCopy, headline: 'Sokha Beauty', about: 'Open daily — closed Sunday' }, 'Sokha Beauty'),
  ), false)
eq('a different single warning is not this one', isOnlyHeadlineIsShopName(sanityCheck(withMarkup, 'Sokha Beauty')), false)

// preferRetry decides whether the second draft replaces the first. Comparing
// headlines alone would prefer a retry that fixed the headline but invented a
// claim or wrote a price into prose, trading a cosmetic flaw for a lie on a
// real business's page, which this product cannot recover from.
const firstDraft = { headline: 'Sokha Beauty', warnings: [{ field: 'headline', issue: 'is only the shop name, which says nothing' }] }
eq('a retry that fixes the headline and adds no new warning wins',
  preferRetry(firstDraft, { headline: 'កាត់សក់នៅតាកែវ', warnings: [] }, 'Sokha Beauty'), true)
eq('a retry that still repeats the shop name loses, even with no other warning',
  preferRetry(firstDraft, { headline: 'Sokha Beauty', warnings: [] }, 'Sokha Beauty'), false)
eq('a retry that fixes the headline but invents a claim loses to the cosmetic flaw',
  preferRetry(firstDraft, { headline: 'ការកាត់សក់ល្អបំផុត', warnings: [{ field: 'headline', issue: 'makes a claim the owner did not make' }] }, 'Sokha Beauty'),
  false)
eq('a retry that fixes the headline but writes a price into prose also loses',
  preferRetry(firstDraft, { headline: 'កាត់សក់ 15000៛', warnings: [{ field: 'headline', issue: 'states a price, which must come from the catalogue instead' }] }, 'Sokha Beauty'),
  false)
// A warning the retry shares with the first draft is not a NEW warning, so it
// does not by itself block the retry (this case cannot occur for the actual
// trigger, whose first draft has exactly the headline warning, but the
// function is general and this pins that "new" means new).
eq('a warning already present in the first draft does not count as new',
  preferRetry(
    { headline: 'Sokha Beauty', warnings: [{ field: 'headline', issue: 'is only the shop name, which says nothing' }, { field: 'about', issue: 'contains an em dash' }] },
    { headline: 'ការកាត់សក់ថាកែវ', warnings: [{ field: 'about', issue: 'contains an em dash' }] },
    'Sokha Beauty',
  ), true)

await expectOk(db, 'a shop gets exactly one site, keyed by its own id',
  `insert into storefronts (id, theme, draft) values ('${B_SALON}', 'salon', '${JSON.stringify(goodCopy)}'::jsonb)`)
await expectFail(db, 'and cannot have a second',
  `insert into storefronts (id, theme) values ('${B_SALON}', 'stay')`, 'storefronts_pkey')
const unpublished = await one(db, `select published, published_at from storefronts where id = '${B_SALON}'`)
// Unpublished means there is NO site. Rendering a draft would be publishing on
// the owner's behalf, which is the one thing generated sites must never do.
eq('a generated draft is not published by existing', unpublished.published, null)
await expectOk(db, 'the owner publishes, and only then',
  `update storefronts set published = draft, published_at = now() where id = '${B_SALON}'`)
const live = await one(db, `select published->>'headline' h, published_at from storefronts where id = '${B_SALON}'`)
eq('the published copy is the draft verbatim', live.h, goodCopy.headline)
if (live.published_at) ok('and the moment it went live is recorded')
else no('publish', 'published_at was not set')
// A theme declared in THEMES and not implemented is a COMPILE error via
// `satisfies Record<ThemeId, ThemeModule>`; this asserts the other direction,
// that the registry is not quietly a different set.
eq('four themes are declared', THEMES.length, 4)

// ── 21. money: KHQR, stock and invoice numbers (PLAN.md Phase 8) ───────────
console.log('\nKHQR payloads')
// PLAN.md asks for exactly this: generate the same payment through payments.ts
// and through ts-khqr and assert they match. A divergence in the TLV lengths or
// the CRC means one of us is wrong, and you want to know on a laptop rather
// than when a customer's banking app refuses to scan in a shop.
const khqrConfig = { accountId: 'sokha@wing', merchantName: 'Sokha Beauty', merchantCity: 'Takeo' }
const expiresAt = Date.now() + 300_000
const reference = KHQR.generate({
  tag: TAG.INDIVIDUAL, accountID: khqrConfig.accountId, merchantName: khqrConfig.merchantName,
  merchantCity: khqrConfig.merchantCity, currency: CURRENCY.KHR, amount: 15000,
  expirationTimestamp: expiresAt, additionalData: { billNumber: 'MN4K2P' },
})
if (reference.data?.qr) {
  // ts-khqr stamps its own creation time, so read it back out and give both
  // sides the same clock. Everything else, including the CRC, must be identical.
  const marker = reference.data.qr.indexOf('9934') + 8
  const createdAtMs = Number(reference.data.qr.slice(marker, marker + 13))
  const ours = buildKhqrPayload(khqrConfig, {
    amount_minor: 15000, currency: 'KHR', reference: 'MN4K2P', createdAtMs, expiresAtMs: expiresAt,
  })
  eq('our KHQR payload is byte for byte what ts-khqr produces', ours, reference.data.qr)
  eq('and the md5 the relay verifies by agrees', khqrMd5(ours), reference.data.md5)
} else {
  no('KHQR cross check', `ts-khqr refused to generate: ${reference.status?.message}`)
}
// CRC-16/CCITT-FALSE over the payload INCLUDING the literal "6304". Pinned
// against a known vector so a refactor of the bit loop cannot go quietly wrong.
eq('the CRC is CCITT-FALSE, not one of the other five CRC-16s', crc16('123456789'), '29B1')
eq('KHR has no decimals, so 15000 riel is 15000', amountField(15000, 'KHR'), '15000')
eq('USD has two, so 1500 minor is 15', amountField(1500, 'USD'), '15')
eq('and 1550 minor is 15.5, not 15.50', amountField(1550, 'USD'), '15.5')

console.log('\nthe shop\'s own Bakong account')
// The money must be the shop's. The rail charges into the three khqr_* columns
// the owner set on /app/money, and nothing else; a QR that pays Moni is a demo,
// not a product. The columns exist, the fallbacks hold, and the payload lands
// in the account the owner typed.
const accountCols = await db.query(
  `select column_name from information_schema.columns
    where table_name = 'businesses' and column_name like 'khqr_%' order by column_name`)
eq('businesses carries the three khqr_* columns', accountCols.rows.map((r) => r.column_name).join(','),
  'khqr_account_id,khqr_merchant_city,khqr_merchant_name')
eq('a shop with no account has no rail', paymentAccountFor({ name: 'Sokha', province: 'Takeo', khqr_account_id: null, khqr_merchant_name: null, khqr_merchant_city: null }), null)
const resolved = paymentAccountFor({ name: 'Sokha Beauty', province: 'Takeo', khqr_account_id: ' SOKHA@WING ', khqr_merchant_name: null, khqr_merchant_city: null })
eq('the account id is lowercased and trimmed, as Bakong ids are', resolved.accountId, 'sokha@wing')
eq('the merchant name falls back to the shop name', resolved.merchantName, 'Sokha Beauty')
eq('the city falls back to the province', resolved.merchantCity, 'Takeo')
eq('and to Phnom Penh when there is no province', paymentAccountFor({ name: 'X', province: null, khqr_account_id: 'x@aba', khqr_merchant_name: null, khqr_merchant_city: null }).merchantCity, 'Phnom Penh')
eq('a 30 character shop name is cut at the EMVCo field limit', paymentAccountFor({ name: 'A'.repeat(30), province: null, khqr_account_id: 'x@aba', khqr_merchant_name: null, khqr_merchant_city: null }).merchantName.length, 25)
eq('name@bank is an account id', KHQR_ACCOUNT_ID.test('sokha_beauty@wing'), true)
eq('a bare word is not', KHQR_ACCOUNT_ID.test('sokha'), false)
eq('nor is a phone number', KHQR_ACCOUNT_ID.test('012345678'), false)
eq('nor is a paste with a space in it', KHQR_ACCOUNT_ID.test('sokha @wing'), false)

const shopRail = shopKhqrRail(resolved)
eq('the shop rail settles riel', shopRail.settlesCurrencies.includes('KHR'), true)
eq('and dollars', shopRail.settlesCurrencies.includes('USD'), true)
eq('and cannot be polled, because nobody outside the shop can see the shop account', shopRail.pollBased, false)
eq('so the cron poller skips it', isPollable(shopRail.id), false)
eq('while CutLuy is still polled', isPollable('cutluy'), true)
const shopCharge = await shopRail.createCharge({ amount_minor: 15000, currency: 'KHR', reference: 'MN4K2P', idempotency_key: 'k' })
eq('the QR carries the shop account in tag 29', shopCharge.qr_payload.includes('2914' + '0010sokha@wing'), true)
eq('and the merchant name the owner will recognise', shopCharge.qr_payload.includes('5912Sokha Beauty'), true)
eq('and the booking code as the bill number', shopCharge.qr_payload.includes('62100106MN4K2P'), true)
eq('and a valid CRC', crc16(shopCharge.qr_payload.slice(0, -4)), shopCharge.qr_payload.slice(-4))
eq('its handle is the md5 of the string, the Bakong convention, so a relay can be added later', shopCharge.provider_ref, khqrMd5(shopCharge.qr_payload))
const shopCheck = await shopRail.checkCharge(shopCharge.provider_ref, 15000, 'KHR')
eq('asked whether it was paid, it says pending and never paid', shopCheck.status, 'pending')

// The owner's confirmation, as the SQL confirm.ts runs. A second tap must change
// nothing, and a row cannot be paid without a time.
await db.exec(`insert into payments (id, business_id, booking_id, amount_minor, currency, provider, provider_account, status, idempotency_key)
  values ('e1000000-0000-4000-8000-000000000001', '${B_SALON}', '90000000-0000-4000-8000-000000000003', 15000, 'KHR', 'khqr', 'sokha@wing', 'pending', 'confirm-test')`)
const firstConfirm = await db.query(`update payments set status = 'paid', paid_at = now(), provider_txn_id = 'owner-confirmed'
  where id = 'e1000000-0000-4000-8000-000000000001' and business_id = '${B_SALON}' and status = 'pending' returning id`)
eq('the owner confirming moves exactly one pending row', firstConfirm.rows.length, 1)
const secondConfirm = await db.query(`update payments set status = 'paid', paid_at = now()
  where id = 'e1000000-0000-4000-8000-000000000001' and business_id = '${B_SALON}' and status = 'pending' returning id`)
eq('and a second tap moves nothing', secondConfirm.rows.length, 0)
const confirmedRow = await one(db, `select provider_account, provider_txn_id from payments where id = 'e1000000-0000-4000-8000-000000000001'`)
eq('the row remembers which account the money went to', confirmedRow.provider_account, 'sokha@wing')
eq('and that a person, not a provider, said it arrived', confirmedRow.provider_txn_id, 'owner-confirmed')

console.log('\nstock and invoice numbers, in one transaction')
// PGlite is Postgres, so the REAL createOrder() runs here against a real engine
// with real row locks. A mock would only agree with itself.
const tx = { query: async (sql, params = []) => (await db.query(sql, params)).rows }
await db.exec(`
  insert into products (id, business_id, name, price_minor, currency, stock) values
   ('e0000000-0000-4000-8000-000000000001','${B_SALON}','ប្រេងលាបសក់', 12000, 'KHR', 3),
   ('e0000000-0000-4000-8000-000000000002','${B_SALON}','សិតសក់', 5000, 'KHR', null),
   ('e0000000-0000-4000-8000-000000000003','${B_HOUSE}','ទឹកសុទ្ធ', 2000, 'KHR', 10)`)

const firstOrder = await createOrder(tx, {
  businessId: B_SALON, customerId: null, channel: 'telegram',
  lines: [{ productId: 'e0000000-0000-4000-8000-000000000001', quantity: 2 },
          { productId: 'e0000000-0000-4000-8000-000000000002', quantity: 1 }],
})
eq('the order totals from the catalogue, never from the caller', firstOrder.totalMinor, 12000 * 2 + 5000)
eq('and invoice numbering starts at one', firstOrder.invoiceNumber, 1)
const stockAfter = await one(db, `select stock from products where id = 'e0000000-0000-4000-8000-000000000001'`)
eq('stock came down by exactly what was sold', stockAfter.stock, 1)
const uncounted = await one(db, `select stock from products where id = 'e0000000-0000-4000-8000-000000000002'`)
// NULL stock means "we do not count this", which is not the same as none left.
eq('an uncounted product is not driven negative', uncounted.stock, null)

const secondOrder = await createOrder(tx, {
  businessId: B_SALON, customerId: null, channel: 'web',
  lines: [{ productId: 'e0000000-0000-4000-8000-000000000001', quantity: 1 }],
})
eq('the next invoice number is the next integer, not a random one', secondOrder.invoiceNumber, 2)

// The oversell. Stock is 0 now, and the conditional UPDATE is what refuses,
// not a read followed by a hopeful write.
let oversell = 'ALLOWED'
try {
  await createOrder(tx, { businessId: B_SALON, customerId: null, channel: 'web',
    lines: [{ productId: 'e0000000-0000-4000-8000-000000000001', quantity: 1 }] })
} catch (e) { oversell = e instanceof OrderError ? e.code : 'other' }
eq('the last item cannot be sold twice', oversell, 'out_of_stock')

// The same product twice in one order is ONE decrement of the sum. Two separate
// decrements would each pass the stock check on their own and oversell.
await db.exec(`update products set stock = 2 where id = 'e0000000-0000-4000-8000-000000000001'`)
let doubled = 'ALLOWED'
try {
  await createOrder(tx, { businessId: B_SALON, customerId: null, channel: 'web',
    lines: [{ productId: 'e0000000-0000-4000-8000-000000000001', quantity: 2 },
            { productId: 'e0000000-0000-4000-8000-000000000001', quantity: 2 }] })
} catch (e) { doubled = e instanceof OrderError ? e.code : 'other' }
eq('a repeated line is summed before the stock check, not checked twice', doubled, 'out_of_stock')

// Tenancy again, at the till: a product id from another shop is not orderable
// here, however it was obtained.
let crossTenant = 'ALLOWED'
try {
  await createOrder(tx, { businessId: B_SALON, customerId: null, channel: 'web',
    lines: [{ productId: 'e0000000-0000-4000-8000-000000000003', quantity: 1 }] })
} catch (e) { crossTenant = e instanceof OrderError ? e.code : 'other' }
eq('another shop\'s product cannot be sold by this one', crossTenant, 'unknown_product')

// Numbers are per BUSINESS. The guesthouse starts at one while the salon is at two.
const houseNumber = await allocateInvoiceNumber(tx, B_HOUSE)
eq('invoice numbers restart per business', houseNumber, 1)
await expectFail(db, 'and two invoices cannot share a number within one business',
  `insert into invoices (business_id, number, total_minor) values ('${B_SALON}', 1, 100)`,
  'invoices_business_id_number_key')
await expectFail(db, 'a line total that disagrees with its own parts is refused by the database',
  `insert into order_items (order_id, name, unit_price_minor, quantity, line_total_minor)
   values ('${firstOrder.orderId}', 'ប្រេង', 12000, 2, 1)`,
  'order_items_total_ok')

// ── 22. CutLuy webhooks: the only honest way to know money moved ───────────
console.log('\nCutLuy webhook deliveries')
const CUT_SECRET = 'whsec_test_endpoint_secret'
const CUT_BODY = '{"id": "PUETcMUOKStjZsCb", "status": "paid", "amount": "1.50", "reference_id": "MN4K2P"}'
const nowSec = Math.floor(Date.now() / 1000)
const sign = (body, t = nowSec, secret = CUT_SECRET) => `t=${t},v1=${expectedSignature(t, body, secret)}`

eq('a genuine delivery verifies',
  verifyCutluyDelivery(CUT_BODY, sign(CUT_BODY), CUT_SECRET).ok, true)
// The signature covers the BYTES CutLuy sent. Parsing and re-serialising changes
// key order and whitespace, and this is the failure that looks like a working
// integration everywhere except production.
eq('the same JSON re-serialised does NOT verify',
  verifyCutluyDelivery(JSON.stringify(JSON.parse(CUT_BODY)), sign(CUT_BODY), CUT_SECRET).ok, false)
eq('an unsigned delivery is refused',
  verifyCutluyDelivery(CUT_BODY, null, CUT_SECRET).reason, 'no_signature')
eq('a malformed signature header is refused',
  verifyCutluyDelivery(CUT_BODY, 'garbage', CUT_SECRET).reason, 'bad_format')
eq('a forged signature is refused',
  verifyCutluyDelivery(CUT_BODY, `t=${nowSec},v1=${'a'.repeat(64)}`, CUT_SECRET).reason, 'mismatch')
eq('the wrong endpoint secret is refused',
  verifyCutluyDelivery(CUT_BODY, sign(CUT_BODY, nowSec, 'whsec_someone_else'), CUT_SECRET).reason, 'mismatch')
// A captured delivery replayed an hour later must not settle a payment again.
eq('a delivery older than the replay window is refused',
  verifyCutluyDelivery(CUT_BODY, sign(CUT_BODY, nowSec - 3_600), CUT_SECRET).reason, 'stale')
eq('and one from the future is refused too',
  verifyCutluyDelivery(CUT_BODY, sign(CUT_BODY, nowSec + 3_600), CUT_SECRET).reason, 'stale')
eq('a delivery four minutes old is still inside the window', withinReplayWindow(nowSec - 240, nowSec), true)
eq('a tampered body invalidates the signature',
  verifyCutluyDelivery(CUT_BODY.replace('1.50', '9.99'), sign(CUT_BODY), CUT_SECRET).reason, 'mismatch')
eq('the header is parsed into its parts', parseSignatureHeader(`t=${nowSec},v1=abcd`)?.timestamp, nowSec)

// ONLY completed means the money moved. scanned means the customer opened the
// QR in their banking app and has not paid; fulfilling on it gives away goods
// for an intention.
eq('payment.completed fulfils', isFulfillingEvent('payment.completed'), true)
eq('payment.scanned does NOT fulfil', isFulfillingEvent('payment.scanned'), false)
eq('and scanned leaves the payment row alone', statusFromEvent('payment.scanned'), 'pending')
eq('payment.expired marks it expired', statusFromEvent('payment.expired'), 'expired')
eq('payment.failed marks it failed', statusFromEvent('payment.failed'), 'failed')
eq('an event we do not know is treated as no news', statusFromEvent('payment.refunded'), 'pending')

// Idempotency, keyed off the payment id and enforced by the transition itself.
// The handler updates only rows still pending, so a redelivery changes nothing.
await db.exec(`
  insert into payments (id, business_id, amount_minor, currency, provider, provider_ref, status, idempotency_key)
  values ('f0000000-0000-4000-8000-0000000000c1','${B_SALON}', 150, 'USD', 'cutluy', 'PUETcMUOKStjZsCb', 'pending', 'cutluy-test-1')`)
const firstSettle = await db.query(`
  update payments set status = 'paid', paid_at = now()
   where provider = 'cutluy' and provider_ref = 'PUETcMUOKStjZsCb' and status = 'pending'
  returning id`)
eq('the first delivery settles the payment', firstSettle.rows.length, 1)
const replay = await db.query(`
  update payments set status = 'paid', paid_at = now()
   where provider = 'cutluy' and provider_ref = 'PUETcMUOKStjZsCb' and status = 'pending'
  returning id`)
eq('and the same event arriving twice changes nothing', replay.rows.length, 0)

// ── 23. operations: caps, limits, and the clock (PLAN.md Phase 9) ──────────
console.log('\nspend ceilings')
// The acceptance check for this phase: a runaway conversation is cut off by the
// cap and not by the bill.
eq('an ordinary turn is allowed',
  checkBudget({ monthMicroUsd: 1_000, conversationMicroUsd: 500 }).allowed, true)
const runaway = checkBudget({ monthMicroUsd: 1_000, conversationMicroUsd: DEFAULT_CONVERSATION_CAP_MICRO_USD })
eq('a runaway conversation is stopped', runaway.allowed, false)
eq('and names the conversation, not the month', runaway.allowed === false && runaway.reason, 'conversation')
const overspent = checkBudget({ monthMicroUsd: DEFAULT_MONTH_CEILING_MICRO_USD, conversationMicroUsd: 0 })
eq('a shop over its month ceiling is stopped', overspent.allowed, false)
eq('and names the month', overspent.allowed === false && overspent.reason, 'month')
// When both are blown, the conversation is the more actionable answer: one
// thread to look at rather than a whole month to explain.
const both = checkBudget({ monthMicroUsd: 9e9, conversationMicroUsd: 9e9 })
eq('both blown reports the conversation first', both.allowed === false && both.reason, 'conversation')
eq('the ceiling is inclusive, so exactly at the cap is refused',
  checkBudget({ monthMicroUsd: 0, conversationMicroUsd: DEFAULT_CONVERSATION_CAP_MICRO_USD }).allowed, false)
eq('a caller may raise the ceiling for one shop',
  checkBudget({ monthMicroUsd: 0, conversationMicroUsd: 200_000 }, { conversationMicroUsd: 500_000 }).allowed, true)
eq('micro dollars read back as money', formatSpend(1_234_567), '$1.23')

console.log('\ninbound rate limit')
const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 })
const t0 = 1_000_000
eq('the first request passes', limiter.check('chat:1', t0).allowed, true)
limiter.check('chat:1', t0); limiter.check('chat:1', t0)
const blocked = limiter.check('chat:1', t0)
eq('the fourth in the window is refused', blocked.allowed, false)
eq('and says how long to wait', blocked.allowed === false && blocked.retryAfterSeconds, 60)
// Per key: one abusive chat must not silence every other customer of the shop.
eq('a different chat is unaffected', limiter.check('chat:2', t0).allowed, true)
eq('the window reopens', limiter.check('chat:1', t0 + 60_001).allowed, true)
// A map that only ever grows is a memory leak wearing a rate limiter's clothes.
const churn = createRateLimiter({ limit: 1, windowMs: 1_000, maxKeys: 5 })
for (let i = 0; i < 50; i += 1) churn.check(`k${i}`, t0 + i * 2_000)
if (churn.size() <= 5) ok(`expired windows are swept, ${churn.size()} keys retained of 50`)
else no('rate limiter', `retained ${churn.size()} keys, which is a leak`)

console.log('\nUSD only')
// CutLuy settles USD and it is now the only rail, so a new shop must default to
// the currency it can actually be paid in.
const defaults = await one(db, `
  select column_default d from information_schema.columns
   where table_name = 'businesses' and column_name = 'default_currency'`)
if (String(defaults.d).includes('USD')) ok('a new shop defaults to USD')
else no('default currency', `still ${defaults.d}`)
const priced = await one(db, `
  select count(*) c from services where currency <> 'USD'`)
eq('every seeded service is priced in USD', Number(priced.c), 0)
// KHR stays in the taxonomy: formatMoney must keep rendering it correctly for
// any historical row, and riel has NO decimal places, which is the trap.
// Latin digits and a comma group: formatMoney never goes near a km-KH locale,
// because Node and Chrome disagree on its separators and that is a hydration
// mismatch on every money string. toKhmerDigits is the separate, later step.
eq('riel still renders with no decimals', formatMoney(15000, 'KHR'), '15,000៛')
eq('and dollars with two', formatMoney(375, 'USD'), '$3.75')

console.log('\nreminders are recorded, not repeated')
// "Already sent" lives in events, so the 24 hour and 1 hour reminders cannot
// suppress one another and a redelivered tick cannot spam a customer.
const aBooking = await one(db, `select id from bookings where business_id = '${B_SALON}' limit 1`)
await expectOk(db, 'a day-before reminder is recorded',
  `insert into events (business_id, actor, action, entity_type, entity_id)
   values ('${B_SALON}','system','reminder.day_before','booking','${aBooking.id}')`)
const sameKind = await one(db, `
  select count(*) c from events where action = 'reminder.day_before' and entity_id = '${aBooking.id}'`)
eq('the tick can see it was already sent', Number(sameKind.c), 1)
const otherKind = await one(db, `
  select count(*) c from events where action = 'reminder.hour_before' and entity_id = '${aBooking.id}'`)
eq('and the hour-before reminder is still owed', Number(otherKind.c), 0)

console.log('\nthe spend meter')
const meter = await one(db, `
  select count(*) c from information_schema.columns
   where table_name = 'v_month_usage' and column_name = 'ai_spend_micro_usd'`)
eq('the month view exposes model spend, so the ceiling has something to read', Number(meter.c), 1)

console.log('\nthe setup spine: has this shop ever served a customer')

// The spine's question is "ever", the meter's is "this month". The WINDOW may
// differ; the counted set may not. `everTxn` and `meterSet` below are both
// built from BILLABLE_BOOKING_STATUSES, not hardcoded, but that alone proves
// nothing: db/schema.sql's v_month_usage view hardcodes
// status in ('confirmed','completed') directly, so both queries here would
// silently rewrite themselves to agree with a changed constant while the VIEW
// stayed on the old list, and this test would stay green through that drift.
// The assertion after meterSet reads v_month_usage itself, which is the one
// that actually catches the view falling behind the constant.
const billable = BILLABLE_BOOKING_STATUSES.map((s) => `'${s}'`).join(',')
const everTxn = `
  select (exists (select 1 from bookings
                   where business_id = $1 and status in (${billable}))
       or exists (select 1 from payments
                   where business_id = $1 and status = 'paid' and booking_id is null)) as ok`

const spineSays = async (biz) =>
  (await one(db, everTxn.replaceAll('$1', `'${biz}'`))).ok === true

eq('the seeded salon has already served someone', await spineSays(B_SALON), true)

await db.exec(`
  insert into businesses (id, slug, name, business_type, category, locale, default_currency)
  values ('b0000000-0000-4000-8000-000000000099', 'brand-new', 'Brand New',
          'salon', 'beauty', 'km', 'KHR')
  on conflict (id) do nothing`)
const B_NEW = 'b0000000-0000-4000-8000-000000000099'

eq('a brand new shop has served nobody', await spineSays(B_NEW), false)

await db.exec(`
  insert into bookings (business_id, service_id, resource_id, customer_id, starts_at, ends_at,
                        status, unit, price_minor, currency, channel, created_by)
  values ('${B_NEW}','${S_CUT}','${R_SOKHA}','${C_SOPHEA}',
          ${at(30, '09:00')}, ${at(30, '09:30')},
          'pending','session',15000,'KHR','web','ai')`)
eq('a PENDING booking is not a transaction (it may never happen)', await spineSays(B_NEW), false)

await db.exec(`update bookings set status = 'confirmed'
                where business_id = '${B_NEW}' and status = 'pending'`)
eq('a CONFIRMED booking is a transaction', await spineSays(B_NEW), true)

// and the counted set matches the meter's re-derivation of the same logic
const meterSet = await one(db, `
  select count(*) c from bookings
   where business_id = '${B_NEW}' and status in (${billable})`)
eq('and the meter counts exactly the same booking', Number(meterSet.c), 1)

// This is the assertion that makes BILLABLE_BOOKING_STATUSES load bearing: it
// reads v_month_usage.txn_used itself, not a query built from the same
// constant the view is supposed to match. If schema.sql's hardcoded
// ('confirmed','completed') ever diverges from BILLABLE_BOOKING_STATUSES,
// this is what turns red.
const viewSays = await one(db, `select txn_used from v_month_usage where business_id = '${B_NEW}'`)
eq('and v_month_usage itself agrees: one billable booking is one transaction', Number(viewSays.txn_used), 1)

console.log('\nthe catalogue: one view, two kinds')
await db.exec(`
  insert into products (id, business_id, name, price_minor, currency, stock, category, photo_path) values
   ('e2000000-0000-4000-8000-000000000001','${B_SALON}','កាហ្វេទឹកកក', 5000, 'KHR', null, 'ភេសជ្ជៈ', '${B_SALON}/e2000000/cup.webp'),
   ('e2000000-0000-4000-8000-000000000002','${B_HOUSE}','ទឹកសុទ្ធតូច', 1000, 'KHR', 24, null, null)`)

const salonCatalogue = await db.query(
  `select kind, name, price_minor, stock, photo_path, duration_min, unit
     from v_catalog where business_id = '${B_SALON}' and active order by kind, name`)
const kinds = [...new Set(salonCatalogue.rows.map((r) => r.kind))].sort()
eq('the view carries both kinds for a shop that has both', kinds.join(','), 'product,service')

const drink = salonCatalogue.rows.find((r) => r.name === 'កាហ្វេទឹកកក')
eq('a product keeps its own price through the view', drink.price_minor, 5000)
eq('a product has no duration, because handing something over takes no appointment', drink.duration_min, null)
eq('a product reads as one item', drink.unit, 'item')
eq('and its photo travels as a storage key, never a URL', drink.photo_path.startsWith('http'), false)

const catalogueService = salonCatalogue.rows.find((r) => r.kind === 'service')
eq('a service still carries its duration', typeof catalogueService.duration_min, 'number')
eq('and a service has no stock, which is not the same as zero', catalogueService.stock, null)

// NULL stock means "we do not count this". The view must not flatten it to 0, or
// a kitchen that does not count soup starts reporting soup as sold out.
eq('an uncounted product stays uncounted through the view', drink.stock, null)
const countedProduct = await one(db, `select stock from v_catalog where id = 'e2000000-0000-4000-8000-000000000002'`)
eq('and a counted one keeps its number', countedProduct.stock, 24)

// The whole point of the tenant argument. The view is security_invoker and every
// caller filters by business_id; this proves the other shop's row is reachable
// only under its own id.
const catalogueLeak = await one(db, `select count(*) c from v_catalog where business_id = '${B_SALON}' and name = 'ទឹកសុទ្ធតូច'`)
eq('another shop\'s product is not in this shop\'s catalogue', Number(catalogueLeak.c), 0)

// The bug this whole pass exists to fix: a cafe has a full menu and no services,
// and every catalogue check in the product counted services only.
const B_CAFE = 'b0000000-0000-4000-8000-000000000009'
await db.exec(`
  insert into businesses (id, slug, name, business_type, default_currency)
   values ('${B_CAFE}', 'test-cafe', 'ហាងកាហ្វេសាកល្បង', 'cafe', 'KHR');
  insert into products (business_id, name, price_minor, currency)
   values ('${B_CAFE}', 'កាហ្វេខ្មៅ', 4000, 'KHR')`)
const cafeCatalogue = await one(db, `select count(*) c from v_catalog where business_id = '${B_CAFE}' and active`)
eq('a cafe with a menu and no services has a catalogue', Number(cafeCatalogue.c), 1)
const cafeServices = await one(db, `select count(*) c from services where business_id = '${B_CAFE}'`)
eq('and it has no services at all, which is why counting those was the bug', Number(cafeServices.c), 0)

console.log('\nwhat a shop sells')
eq('every business type declares what it sells', BUSINESS_TYPES.every((t) => ['time', 'goods', 'both'].includes(t.sells)), true)
eq('a cafe sells goods as well as time', sellsFor('cafe'), 'both')
eq('a salon sells time', sellsFor('salon'), 'time')
eq('an unknown type is assumed to sell both, so nothing is hidden from a shop', sellsFor('spaceship_repair'), 'both')

console.log('\nproduct photos: what may be uploaded')
const okUpload = assertUploadable('image/webp', 40_000)
eq('a webp is accepted and names its extension', `${okUpload.mediaType} ${okUpload.extension}`, 'image/webp webp')
eq('a jpeg is accepted', assertUploadable('image/jpeg', 1000).extension, 'jpg')
eq('a png is accepted', assertUploadable('image/png', 1000).extension, 'png')
// The content type arrives from a phone and decides what we write to a PUBLIC
// bucket, so anything unrecognised is refused rather than stored and guessed at.
const refusesUpload = (type, size, why) => {
  try {
    assertUploadable(type, size)
    no(why, 'it was accepted')
  } catch (error) {
    if (error instanceof MediaError) ok(`${why} (${error.status})`)
    else no(why, `wrong error type: ${error.message}`)
  }
}
refusesUpload('image/gif', 1000, 'an animated gif is refused, since a menu photo is one frame')
refusesUpload('application/pdf', 1000, 'a pdf is refused')
refusesUpload(null, 1000, 'a missing content type is refused rather than assumed')
refusesUpload('image/webp', MAX_IMAGE_BYTES + 1, 'an oversized image is refused before it reaches storage')
refusesUpload('image/webp', 0, 'an empty body is refused')
// A content type may carry parameters, which a naive equality check rejects.
eq('a charset parameter does not break the check', assertUploadable('image/webp; charset=binary', 500).extension, 'webp')

console.log('\nproduct photos: where they are written')
const photoKey = storageKey(B_SALON, 'e2000000-0000-4000-8000-000000000001', 'webp')
eq('the shop id leads the key, so one prefix is one shop', photoKey.startsWith(`${B_SALON}/`), true)
eq('the product id follows it', photoKey.split('/')[1], 'e2000000-0000-4000-8000-000000000001')
eq('and the file keeps its extension', photoKey.endsWith('.webp'), true)
// Two uploads for one product must not collide, or replacing a photo would
// serve the old one from a cache that already holds the name.
eq('two uploads for the same product get different keys',
  photoKey === storageKey(B_SALON, 'e2000000-0000-4000-8000-000000000001', 'webp'), false)

console.log('\nthe shop site shows what the shop sells')
// getStorefront is a query rather than a pure function, so what is asserted here
// is the contract it now depends on: the view answers for a shop with NO
// services, which is the whole cafe case, and it carries the photo key the
// theme turns into a URL.
const cafeSite = await db.query(
  `select kind, name, photo_path, category from v_catalog where business_id = '${B_CAFE}' and active`)
eq('a cafe site has rows to render', cafeSite.rows.length > 0, true)
eq('and every one of them is a product', cafeSite.rows.every((r) => r.kind === 'product'), true)
// A menu must read correctly for a shop that uploaded nothing, so a null photo
// is a normal row and never a broken image.
eq('a product with no photo is still a row', cafeSite.rows.every((r) => 'photo_path' in r), true)

console.log('\na haircut never had a photo, so it never gets a tile either')
// db/seed.sql's two demo businesses, the salon and the guesthouse, are both
// services only. That makes a services-only shop the ORDINARY case, not an
// edge case, and every earlier check here only ever exercised the product-only
// cafe: `Items` in src/themes/registry.tsx would have drawn a pattern tile
// beside every row of every salon and guesthouse menu, unconditionally.
// `catalogueService` and `cafeSite.rows[0]` are the real fixture rows from
// above, not invented ones, so this pins the exact predicate `Items` branches
// on against real data instead of a hand-typed shape.
eq('a service with no photo draws no tile, exactly as it rendered before tiles existed',
  shouldDrawTile(catalogueService.kind, catalogueService.photo_path), false)
eq('a product with no photo still draws its tile', shouldDrawTile(cafeSite.rows[0].kind, cafeSite.rows[0].photo_path), true)
// The photo branch is untouched by this fix: a row that does have a photo
// never reaches the tile decision at all, product or service.
eq('a product that already has a photo does not also want a tile', shouldDrawTile(drink.kind, drink.photo_path), false)

console.log('\nwhat the owner is told her assistant did')
// The owner trying her own shop is asking one question: did that answer come
// from MY prices, or did the model invent it. The tool calls are the evidence.
const groundedTurn = describeTurn([{ tool: 'get_business' }, { tool: 'list_slots' }])
eq('a reply that read the shop is marked grounded', groundedTurn.grounded, true)
eq('and every call it made is listed', groundedTurn.steps.length, 2)
eq('a reply that called nothing is NOT grounded', describeTurn([]).grounded, false)
eq('and an undefined tool list is the same answer', describeTurn(undefined).grounded, false)
// Handing over is not evidence about prices. A reply that only escalated rests
// on nothing, and saying otherwise would be the exact lie this panel exists to
// catch.
eq('handing over alone is not grounding', describeTurn([{ tool: 'escalate_to_owner' }]).grounded, false)
eq('but it is still shown as a step', describeTurn([{ tool: 'escalate_to_owner' }]).steps.length, 1)
// The old map dropped anything it did not recognise, so a real call could
// vanish from the trace entirely. A step the owner cannot read beats a step she
// never learns about.
const unknown = describeTurn([{ tool: 'some_new_tool' }])
eq('an unlabelled tool is named, never dropped', unknown.steps.length, 1)
eq('and it still counts as reading the shop', unknown.grounded, true)
eq('repeated calls are not collapsed, because two lookups is what happened',
  describeTurn([{ tool: 'list_slots' }, { tool: 'list_slots' }]).steps.length, 2)
eq('no em dash reaches a trace line', groundedTurn.steps.some((s) => s.includes('—')), false)

console.log('\na shop\'s look is a vibe plus a seed')
// The vibe is three closed enums, so the model can get it wrong only in ways
// the schema already refuses. Twenty-seven combinations is the whole space.
eq('three warmths', WARMTHS.length, 3)
eq('three voices', VOICES.length, 3)
eq('three densities', DENSITIES.length, 3)
// Every storefront published before this phase has no vibe in its jsonb. A
// missing vibe must be a default, never a crash on a real shop's live site.
eq('a content object with no vibe falls back', vibeOf({ headline: 'x' }).warmth, DEFAULT_VIBE.warmth)
eq('and a stated vibe is used as stated', vibeOf({ vibe: { warmth: 'cool', voice: 'bright', density: 'compact' } }).voice, 'bright')
// A vibe that is present but malformed is the same case as absent: the site
// still has to render.
eq('a malformed vibe falls back too', vibeOf({ vibe: { warmth: 'purple' } }).warmth, DEFAULT_VIBE.warmth)

// db/seed.sql inserts no storefronts rows, so the seed column is proved here by
// inserting one and checking what the column default does on its own, the same
// way the cafe catalogue bug above builds its own row rather than reading seed data.
const existingCafeStorefront = await one(db, `select seed from storefronts where id = '${B_CAFE}'`)
if (!existingCafeStorefront) {
  await db.query(`insert into storefronts (id, theme) values ('${B_CAFE}', 'counter')`)
}
const seeded = await one(db, `select seed from storefronts where id = '${B_CAFE}'`)
eq('a new storefront row gets a seed without being given one', Number.isInteger(Number(seeded.seed)), true)
eq('and it is inside the 31 bit range', Number(seeded.seed) >= 0 && Number(seeded.seed) <= 2147483647, true)

console.log('\nno seed may produce a site a customer cannot read')
// This is the guardrail that matters. A generated palette that renders
// unreadable Khmer on a real shop's public site is the same class of failure
// the never-emit-markup rule exists to prevent, so it gets the same treatment:
// the function clamps, and the harness proves the clamp.
const VIBES = []
for (const warmth of WARMTHS) for (const voice of VOICES) for (const density of DENSITIES) {
  VIBES.push({ warmth, voice, density })
}
eq('the vibe space is twenty seven', VIBES.length, 27)

// contrastRatio is what every assertion below trusts. Nothing above this line
// checks it against a value this codebase did not itself compute, so without
// these four fixtures the whole readability claim would rest on arithmetic
// nobody verified: paletteFor's clamp loop exits on this same function, so a
// sweep that only calls contrastRatio again is unfalsifiable. These four are
// independently known, not derived here: WCAG's own worked pairs (black and
// white are the two ends of the scale, a colour against itself is a fixed
// point) plus #767676, the shade the accessibility community treats as the
// canonical AA text boundary at exactly 4.54.
const round2 = (n) => Math.round(n * 100) / 100
eq('white on black is the maximum possible contrast', round2(contrastRatio({ h: 0, s: 0, l: 100 }, { h: 0, s: 0, l: 0 })), 21)
eq('#767676 on white sits on the canonical AA boundary', round2(contrastRatio({ h: 0, s: 0, l: (118 / 255) * 100 }, { h: 0, s: 0, l: 100 })), 4.54)
eq('pure blue on white is 8.59', round2(contrastRatio({ h: 240, s: 100, l: 50 }, { h: 0, s: 0, l: 100 })), 8.59)
eq('a colour against itself is exactly 1', contrastRatio({ h: 200, s: 40, l: 55 }, { h: 200, s: 40, l: 55 }), 1)

// Every ink this sweep measures has to be an ink the PAGE paints, or the sweep
// is measuring its own record. That was the defect: `paletteFor` returned a
// label colour, this file asserted 7:1 against it, and `styleFor` emitted no
// token carrying it, so `:root`'s dark block went on owning `--label` and every
// shop's site rendered near-white on near-white for a dark-system visitor at a
// measured 1.04:1 while this assertion stayed green. So before any ratio is
// asserted: every custom property styleFor emits must be read by something.
const CONSUMERS = ['../src/app/globals.css', '../src/themes/registry.tsx',
  '../src/components/storefront/product-tile.tsx', '../src/app/s/[slug]/page.tsx']
  .map((f) => readFileSync(join(here, f), 'utf8')).join('\n')
const emitted = Object.keys(styleFor(4242, DEFAULT_VIBE, 'counter').vars)
const unread = emitted.filter((name) => !CONSUMERS.includes(`var(${name})`))
eq(`all ${emitted.length} seeded tokens are read by a file that renders`, unread.join(',') || 'none', 'none')

console.log('\nthe page renders what it was given, and draws nothing for what it was not')
// No JSX renderer runs in this harness (registry.tsx and page.tsx are read as
// text above too, for the same reason), so what is provable here is the
// source shape. A token-presence check like `slice.includes('hasHours ?')`
// proves a NAME occurs somewhere in the file, not what renders: inverting the
// ternary to `hasHours ? 'mt-8' : 'mt-8 border-t border-separator pt-6'`
// draws the border only when there are NO hours, this bug in its purest form,
// and that check still passes. Every assertion below instead extracts the
// actual branch structure and checks which side carries which content, so an
// inversion changes the answer.
const registrySource = readFileSync(join(here, '../src/themes/registry.tsx'), 'utf8')
const salonStart = registrySource.indexOf('function SalonStorefront')
const stayStart = registrySource.indexOf('function StayStorefront')
const workshopStart = registrySource.indexOf('function WorkshopStorefront')
const counterStart = registrySource.indexOf('function CounterStorefront')
const registryEnd = registrySource.indexOf('export const THEME_REGISTRY')
const salonSlice = registrySource.slice(salonStart, stayStart)
const staySlice = registrySource.slice(stayStart, workshopStart)
const workshopSlice = registrySource.slice(workshopStart, counterStart)
const counterSlice = registrySource.slice(counterStart, registryEnd)

// True only when `<tag` sits inside the branch that runs WHEN the guard is
// true, i.e. between `highlights.length > 0 ? (` and its matching `) : null}`.
// Swapping which branch holds the list (or holding neither) fails this even
// though the substrings `highlights.length > 0`, the tag and `null` all still
// occur somewhere in the slice.
function highlightsRenderInTrueBranch(slice, tag) {
  const match = /highlights\.length > 0 \? \(([\s\S]*?)\) : null\}/.exec(slice)
  return !!match && new RegExp(`<${tag}\\b`).test(match[1])
}
// counter is the theme a cafe gets, and it, along with salon, was one of the
// two themes of the four that never rendered the highlights the model wrote:
// sanityCheck validates them and the page dropped them on the floor, which is
// a large part of why those pages read as thin.
eq('the counter theme renders the highlights the model wrote in its true branch',
  highlightsRenderInTrueBranch(counterSlice, 'ul'), true)
eq('the salon theme renders them too: the brief said it was the only theme missing them, and that was wrong',
  highlightsRenderInTrueBranch(salonSlice, 'ul'), true)
eq('the stay theme renders them in its true branch', highlightsRenderInTrueBranch(staySlice, 'ul'), true)
eq('the workshop theme renders its numbered list in its true branch too', highlightsRenderInTrueBranch(workshopSlice, 'ol'), true)
// The false branch (`highlights.length === 0`) must be `null` and nothing
// else, in all four: an empty list draws nothing, not an empty bordered box.
for (const [name, slice] of [['salon', salonSlice], ['stay', staySlice], ['workshop', workshopSlice], ['counter', counterSlice]]) {
  eq(`and ${name}'s false branch draws nothing`, /highlights\.length > 0 \? \([\s\S]*?\) : null\}/.test(slice), true)
}

// True only when the branch RETURNED when hasHours is true carries the
// border, and the other branch does not. This is the exact assertion the
// reviewer's inverted ternary (`hasHours ? 'mt-8' : 'mt-8 border-t ...'`)
// fails, where the old `includes('hasHours ?')` check did not.
function ternaryBranches(slice, conditionName) {
  const match = new RegExp(`${conditionName} \\? '([^']*)' : '([^']*)'`).exec(slice)
  return match ? { whenTrue: match[1], whenFalse: match[2] } : null
}
const hoursTernary = ternaryBranches(counterSlice, 'hasHours')
eq('the hours divider is present when there ARE hours to show',
  !!hoursTernary && hoursTernary.whenTrue.includes('border-t border-separator'), true)
eq('and absent when there are none, not the other way round',
  !!hoursTernary && !hoursTernary.whenFalse.includes('border-t'), true)

const storefrontPageSource = readFileSync(join(here, '../src/app/s/[slug]/page.tsx'), 'utf8')
// The shop's address and phone are the two facts a customer needs to reach it
// physically: text-label-3 measured 1.91:1 against the seeded surface, which
// the contrast sweep above never caught because nothing there reads page.tsx
// for which ink a given line actually uses, only which tokens exist at all.
eq('the address and phone render on the readable secondary ink',
  /text-label-2">\s*\{data\.shop\.address/.test(storefrontPageSource), true)
eq('"Made with Moni" stays on the tertiary ink, which is genuinely secondary',
  /text-label-3">Made with Moni/.test(storefrontPageSource), true)

let worstButton = Infinity, worstAccent = Infinity, worstBody = Infinity, worstLeading = Infinity
let worstSecondary = Infinity, worstSeparator = Infinity
// A fixed arithmetic step (`i * k % modulus`) is a lattice, not a sample: every
// seed lands a constant distance from the last, so a failure mode that only
// shows up between the rungs would never be seen no matter how many rungs
// there are. Math.random() would spread out, but a flaky harness is worse than
// a slow one: a run that fails on Tuesday and passes on Wednesday teaches
// nobody anything. mulberry32 gives the spread of a random sample and the
// reproducibility of a fixed one, seeded once so a red run is the same red run
// every time.
const seedPicker = mulberry32(20260903)
const SEEDS = []
for (let i = 0; i < 400; i++) SEEDS.push(Math.floor(seedPicker() * 2147483647))
for (const seed of SEEDS) {
  for (const vibe of VIBES) {
    const p = paletteFor(seed, vibe)
    worstButton = Math.min(worstButton, contrastRatio(p.accent, p.onAccent))
    worstAccent = Math.min(worstAccent, contrastRatio(p.accent, p.surface))
    worstBody = Math.min(worstBody, contrastRatio(p.label, p.surface))
    worstSecondary = Math.min(worstSecondary, contrastRatio(p.labelSecondary, p.surface))
    worstSeparator = Math.min(worstSeparator, contrastRatio(p.separator, p.surface))
    for (const theme of THEMES) {
      const s = styleFor(seed, vibe, theme.id)
      worstLeading = Math.min(worstLeading, parseFloat(s.vars['--sf-leading']))
    }
  }
}
eq(`a call to action is legible on every one of ${SEEDS.length * VIBES.length} palettes`, worstButton >= 4.5, true)
eq('accent text on the page ground is legible', worstAccent >= 3, true)
eq('body copy on the page ground is legible', worstBody >= 7, true)
// 4.5:1 is WCAG AA for normal-size text, and the secondary ink is normal-size
// text: every subhead, every day name in the opening hours, an item's English
// name under its Khmer one. It is quieter than the body ink, not a different
// class of thing, so it owes the same floor.
eq('the secondary ink is normal-size text and owes the text floor', worstSecondary >= 4.5, true)
// 3:1 is WCAG 1.4.11, the floor for a graphical object the content is read
// through, which is what a row rule is on a phone-width menu: it is the thing
// binding a dish to its price. Not the 4.5 above it, because nobody reads the
// line itself.
eq('a row rule is a graphical object and owes the non-text floor', worstSeparator >= 3, true)
eq('and Khmer never drops below 1.75 leading', worstLeading >= 1.75, true)

// Determinism is not a convenience. A shop whose site changed colour between
// two page loads would look broken to its own customers.
const a1 = styleFor(12345, { warmth: 'warm', voice: 'crafted', density: 'airy' }, 'counter')
const a2 = styleFor(12345, { warmth: 'warm', voice: 'crafted', density: 'airy' }, 'counter')
eq('the same seed and vibe give a byte identical style', JSON.stringify(a1), JSON.stringify(a2))
const b1 = styleFor(999, { warmth: 'warm', voice: 'crafted', density: 'airy' }, 'counter')
eq('a different seed gives a different style', JSON.stringify(a1) === JSON.stringify(b1), false)
// The vibe has to actually do something, or the model is filling a field for
// nothing.
const warmHue = paletteFor(4242, { warmth: 'warm', voice: 'plain', density: 'airy' }).accent.h
const coolHue = paletteFor(4242, { warmth: 'cool', voice: 'plain', density: 'airy' }).accent.h
eq('warm and cool land in different hue bands', Math.abs(warmHue - coolHue) > 100, true)

// The default vibe is the one that has to carry the variation, and it was the
// one that had almost none. Every storefront row written before this phase has
// no vibe, and every generation that names none falls back here, so neutral and
// plain will be a large share of all published shops: four of them looked like
// four shades of the same green with the same square corner and the same rule.
// These four assertions are the "visibly different" acceptance line made
// falsifiable, over the same fixed sample as the contrast sweep above.
const defaultLooks = SEEDS.map((seed) => ({ s: styleFor(seed, DEFAULT_VIBE, 'counter'), p: paletteFor(seed, DEFAULT_VIBE) }))
const looks = new Set(defaultLooks.map(({ s }) => `${s.vars['--sf-radius']}|${s.rule}|${s.vars['--sf-weight-heading']}`))
const defaultHues = defaultLooks.map(({ p }) => p.accent.h)
eq('the default vibe draws from more than a handful of shapes', looks.size >= 12, true)
eq('and its hue band is wide enough to tell two neighbours apart',
  Math.round(Math.max(...defaultHues) - Math.min(...defaultHues)) >= 80, true)
// The other half of the same claim: a band widened until it means nothing has
// not been widened, it has been deleted. Neutral must still sit clear of both
// its neighbours, and plain must still corner harder than crafted.
const hueOf = (warmth) => SEEDS.map((seed) => paletteFor(seed, { warmth, voice: 'plain', density: 'airy' }).accent.h)
const radiusOf = (voice) => SEEDS.map((seed) => parseInt(styleFor(seed, { warmth: 'neutral', voice, density: 'airy' }, 'counter').vars['--sf-radius'], 10))
eq('neutral still sits clear of warm and of cool',
  Math.max(...hueOf('warm')) < Math.min(...hueOf('neutral')) && Math.max(...hueOf('neutral')) < Math.min(...hueOf('cool')), true)
eq('and a plain corner is still crisper than a crafted one',
  Math.max(...radiusOf('plain')) < Math.min(...radiusOf('crafted')), true)

// The picker offers four looks. It must never offer the one she already has,
// or a reshuffle would silently do nothing.
const cands = candidateSeeds(777, 4)
eq('the picker offers four candidates', cands.length, 4)
eq('all four are distinct', new Set(cands).size, 4)
eq('and none is the seed she already has', cands.includes(777), false)
eq('every candidate is a valid 31 bit seed', cands.every((s) => Number.isInteger(s) && s >= 0 && s <= 2147483647), true)
eq('the shuffle is reproducible from its input', JSON.stringify(candidateSeeds(777, 4)), JSON.stringify(cands))

console.log('\nthe vibe comes from the owner\'s own words')
// sanityCheck is what stands between a generation and a real shop's site. It
// already catches markup, a price in prose and an invented claim. A vibe that
// is missing or nonsense is the same kind of defect and gets caught the same
// way, before the owner can publish it.
const noVibe = sanityCheck({ theme: 'counter', headline: 'Good coffee', subhead: 'Open early every day', about: 'A small cafe run by one family since the shop opened.', highlights: ['Open Saturday', 'Two staff'], callToAction: 'Order', notice: null }, 'Sok Cafe')
eq('a generation with no vibe is flagged', noVibe.some((w) => w.field === 'vibe'), true)
const badVibe = sanityCheck({ theme: 'counter', vibe: { warmth: 'purple', voice: 'plain', density: 'airy' }, headline: 'Good coffee', subhead: 'Open early every day', about: 'A small cafe run by one family since the shop opened.', highlights: ['Open Saturday', 'Two staff'], callToAction: 'Order', notice: null }, 'Sok Cafe')
eq('a vibe outside the taxonomy is flagged', badVibe.some((w) => w.field === 'vibe'), true)
const goodVibe = sanityCheck({ theme: 'counter', vibe: { warmth: 'warm', voice: 'plain', density: 'airy' }, headline: 'Good coffee', subhead: 'Open early every day', about: 'A small cafe run by one family since the shop opened.', highlights: ['Open Saturday', 'Two staff'], callToAction: 'Order', notice: null }, 'Sok Cafe')
eq('a stated vibe passes', goodVibe.some((w) => w.field === 'vibe'), false)

console.log('\na menu with half its photos still reads as a menu')
// Uploading stays the real path. A tile is what a row gets when there is
// nothing to upload yet, and it must never resemble a photograph or a broken
// image. Keyed on the product id and not the name, so renaming an item does
// not change how it looks.
const tileA = tileFor(4242, '11111111-1111-1111-1111-111111111111')
const tileB = tileFor(4242, '11111111-1111-1111-1111-111111111111')
eq('the same product gets the same tile every time', JSON.stringify(tileA), JSON.stringify(tileB))
const tileC = tileFor(4242, '22222222-2222-2222-2222-222222222222')
eq('a different product gets a different tile', JSON.stringify(tileA) === JSON.stringify(tileC), false)
const tileD = tileFor(999, '11111111-1111-1111-1111-111111111111')
eq('and the same product in a different shop differs too', JSON.stringify(tileA) === JSON.stringify(tileD), false)
eq('every tile names a real pattern', TILE_PATTERNS.includes(tileA.pattern), true)
eq('and a rotation the SVG can use', [0, 90, 180, 270].includes(tileA.rotation), true)

// ROTATIONS_FOR is a claim about the ART: that its listed rotations are
// pairwise genuinely different pictures, and every rotation it leaves out
// reproduces exactly one of them. Checking that tileFor draws from the table
// proves nothing, since tileFor's own implementation IS that draw: it cannot
// fail whatever the table holds. This instead rotates patternGeometry's real
// coordinates about the tile's own centre and compares the actual shapes, so
// a future redraw of a pattern, or a wrong entry in the table, breaks this
// immediately. A degree-90 rotation's opposite pair is not always the base
// (0): bars' four rotations split into {0, 180} and {90, 270}, so 270
// reproduces 90, not 0. The check below asks the general question, not that
// specific shape.
const ROTATION_EPSILON = 1e-6
function rotatePoint(x, y, deg) {
  const rad = (deg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = x - 28
  const dy = y - 28
  return [28 + dx * cos - dy * sin, 28 + dx * sin + dy * cos]
}
function rotateGeometry(primitives, deg) {
  return primitives.map((p) => {
    if (p.kind === 'line') {
      const [x1, y1] = rotatePoint(p.x1, p.y1, deg)
      const [x2, y2] = rotatePoint(p.x2, p.y2, deg)
      return { kind: 'line', x1, y1, x2, y2 }
    }
    if (p.kind === 'circle') {
      const [cx, cy] = rotatePoint(p.cx, p.cy, deg)
      return { kind: 'circle', cx, cy, r: p.r }
    }
    return { kind: 'path', points: p.points.map(({ x, y }) => { const [rx, ry] = rotatePoint(x, y, deg); return { x: rx, y: ry } }) }
  })
}
function near(a, b) {
  return Math.abs(a - b) < ROTATION_EPSILON
}
// A line has no direction and a sampled curve's trace direction is not part
// of what a viewer sees, so two primitives are the same shape if they match
// point for point either forwards or backwards, comparing by value with an
// epsilon rather than by a rounded string, which a value that lands near a
// rounding boundary (an exact .xxxx5) can flip either way on.
function samePrimitive(a, b) {
  if (a.kind !== b.kind) return false
  if (a.kind === 'circle') return near(a.cx, b.cx) && near(a.cy, b.cy) && near(a.r, b.r)
  if (a.kind === 'line') {
    const straight = near(a.x1, b.x1) && near(a.y1, b.y1) && near(a.x2, b.x2) && near(a.y2, b.y2)
    const reversed = near(a.x1, b.x2) && near(a.y1, b.y2) && near(a.x2, b.x1) && near(a.y2, b.y1)
    return straight || reversed
  }
  if (a.points.length !== b.points.length) return false
  const n = a.points.length
  let forward = true
  let backward = true
  for (let i = 0; i < n; i++) {
    if (!(near(a.points[i].x, b.points[i].x) && near(a.points[i].y, b.points[i].y))) forward = false
    const j = n - 1 - i
    if (!(near(a.points[i].x, b.points[j].x) && near(a.points[i].y, b.points[j].y))) backward = false
  }
  return forward || backward
}
// Two whole pictures match when every primitive in one has an unused,
// matching primitive in the other: primitive order is not part of what a
// viewer sees either.
function samePicture(listA, listB) {
  if (listA.length !== listB.length) return false
  const used = new Array(listB.length).fill(false)
  for (const a of listA) {
    const j = listB.findIndex((b, k) => !used[k] && samePrimitive(a, b))
    if (j === -1) return false
    used[j] = true
  }
  return true
}
let rotationTableTrueAboutTheArt = true
for (const pattern of TILE_PATTERNS) {
  for (const density of [2, 3, 4, 5]) {
    const base = patternGeometry(pattern, density)
    const pictures = { 0: base, 90: rotateGeometry(base, 90), 180: rotateGeometry(base, 180), 270: rotateGeometry(base, 270) }
    const listed = ROTATIONS_FOR[pattern]
    // Every rotation must match exactly one listed representative.
    for (const deg of [0, 90, 180, 270]) {
      const matches = listed.filter((ld) => samePicture(pictures[deg], pictures[ld]))
      if (matches.length !== 1) rotationTableTrueAboutTheArt = false
    }
    // The listed representatives must be pairwise distinct pictures, or the
    // table is claiming two different rotations for what is really one look.
    for (let i = 0; i < listed.length; i++) {
      for (let j = i + 1; j < listed.length; j++) {
        if (samePicture(pictures[listed[i]], pictures[listed[j]])) rotationTableTrueAboutTheArt = false
      }
    }
  }
}
eq('ROTATIONS_FOR names exactly the rotations each pattern repeats under, at every density', rotationTableTrueAboutTheArt, true)

// arcs used to reach r = 38, a semicircle spanning x from -11.5 to 67.5
// against this 56 by 56 box: it fit only because the wrapper clips overflow,
// silently truncating the largest ring into a flat sliver on every arcs tile
// on every real shop's menu. Every primitive of every pattern, at every
// density, must fit inside the tile, stroke width included, or the same
// silent clipping can happen again to any pattern.
const STROKE = 3
// Display rounding only, for the console line below: the containment check
// itself compares the unrounded numbers against 0 and 56 directly.
function roundN(n) {
  return Math.round(n * 10000) / 10000
}
let everyPrimitiveContained = true
const measuredBounds = {}
for (const pattern of TILE_PATTERNS) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const density of [2, 3, 4, 5]) {
    for (const p of patternGeometry(pattern, density)) {
      const corners =
        p.kind === 'circle'
          ? [[p.cx - p.r, p.cy], [p.cx + p.r, p.cy], [p.cx, p.cy - p.r], [p.cx, p.cy + p.r]]
          : p.kind === 'line'
            ? [[p.x1, p.y1], [p.x2, p.y2]]
            : p.points.map(({ x, y }) => [x, y])
      for (const [x, y] of corners) {
        minX = Math.min(minX, x - STROKE / 2)
        minY = Math.min(minY, y - STROKE / 2)
        maxX = Math.max(maxX, x + STROKE / 2)
        maxY = Math.max(maxY, y + STROKE / 2)
      }
    }
  }
  measuredBounds[pattern] = { minX: roundN(minX), minY: roundN(minY), maxX: roundN(maxX), maxY: roundN(maxY) }
  if (minX < 0 || minY < 0 || maxX > 56 || maxY > 56) everyPrimitiveContained = false
}
console.log('measured bounds, stroke included:', JSON.stringify(measuredBounds))
eq('every primitive of every pattern fits inside the 56 by 56 tile at every density', everyPrimitiveContained, true)

// Across a shop's whole menu the tiles must actually vary, or the fallback is
// one grey square repeated and the owner may as well have had nothing. The
// visual space is pattern times its own rotation count times tint times
// density: 1+1+2+2+4+4 rotation classes across the six patterns, times 3
// tints, times 4 densities, is 168 genuinely different pictures, so 60
// products drawing from it should mostly miss each other. Measured directly:
// 60 products produce 52 distinct tiles here, comfortably above the 45 floor.
const spread = new Set()
for (let i = 0; i < 60; i++) spread.add(JSON.stringify(tileFor(4242, `product-${i}`)))
eq(`sixty items produce ${spread.size} distinct tiles`, spread.size >= 45, true)

console.log('\nthe owner chooses her own shop\'s look')
// The route accepts an integer and nothing else. A seed is the one number that
// decides a whole public site, so a float, a negative or an overflow is a
// refusal rather than a coerced value that renders something nobody chose.
eq('a valid seed passes the guard', isSeed(12345), true)
eq('zero is a valid seed', isSeed(0), true)
eq('the top of the range is valid', isSeed(2147483647), true)
eq('a float is refused', isSeed(1.5), false)
eq('a negative is refused', isSeed(-1), false)
eq('past the range is refused', isSeed(2147483648), false)
eq('a string is refused', isSeed('12345'), false)
eq('NaN is refused', isSeed(NaN), false)

console.log('\nthe owner learns what is missing before her customers do')
// She should find out on her own products screen, not by looking at her
// published site and noticing the pattern tiles.
// This is expected to pass today: photo_path already exists. The point of
// pinning it here is that a later schema edit which drops or renames that
// column fails this assertion loudly, instead of silently emptying the
// owner's products-page prompt.
const missing = await one(db, `select count(*) c from products where business_id = '${B_CAFE}' and active and photo_path is null`)
eq('the count of photoless items is answerable in one query', Number.isInteger(Number(missing.c)), true)

console.log('\nwhat a shop sells decides which table a row lives in')
// The bug this closes: setup/persist.ts wrote EVERY parsed row to services, so
// a cafe's cappuccino was filed as a service, could never hold a photo, and
// could never be ordered. The rule needs no column: `sells` already lives on
// the business type and `unit` already rides on every parsed row.
eq('a cafe walk-in row is a product', catalogKindFor('cafe', 'walk_in'), 'product')
eq('a cafe session row is still a service', catalogKindFor('cafe', 'session'), 'service')
// A time-selling business is never talked into products by a stray unit. A
// salon that somehow parsed a walk-in row is still selling time.
eq('a salon walk-in row stays a service', catalogKindFor('salon', 'walk_in'), 'service')
eq('a salon session row is a service', catalogKindFor('salon', 'session'), 'service')
// A restaurant sells both: the table booking is time, the dish is a thing.
eq('a restaurant table booking is a service', catalogKindFor('restaurant', 'session'), 'service')
eq('a restaurant dish is a product', catalogKindFor('restaurant', 'walk_in'), 'product')
// An unknown business type falls back to `both`, so the unit decides.
eq('an unknown type still routes by unit', catalogKindFor('not_a_real_type', 'walk_in'), 'product')
// Every type crossed with every unit must return a real kind, never undefined.
let unrouted = 0
for (const type of BUSINESS_TYPES) {
  for (const unit of BOOKING_UNITS) {
    const kind = catalogKindFor(type.id, unit)
    if (kind !== 'product' && kind !== 'service') unrouted++
  }
}
eq(`every one of ${BUSINESS_TYPES.length * BOOKING_UNITS.length} type and unit pairs routes`, unrouted, 0)
// A time-selling type can never produce a product, on any unit at all.
const timeTypes = BUSINESS_TYPES.filter((t) => t.sells === 'time')
let timeLeak = 0
for (const type of timeTypes) {
  for (const unit of BOOKING_UNITS) {
    if (catalogKindFor(type.id, unit) === 'product') timeLeak++
  }
}
eq(`none of the ${timeTypes.length} time-selling types leaks a product`, timeLeak, 0)

console.log('\nthe setup screen tells the owner which table she is about to fill')
// The bug this closes: ShopSetup's review screen called every parsed row a
// "service" and showed her that word right beside the save button, so a cafe
// owner was told she was about to save services when her whole menu was
// about to become products. catalogueCounts is the same catalogKindFor split
// persistSetup actually writes with, read here as its own pure function so
// this is provable without a browser.
eq('a cafe\'s whole menu counts as products, not services',
  catalogueCounts('cafe', [{ unit: 'walk_in' }, { unit: 'walk_in' }]).products, 2)
eq('and none of it is miscounted as a service',
  catalogueCounts('cafe', [{ unit: 'walk_in' }, { unit: 'walk_in' }]).services, 0)
eq('a salon\'s chair time counts as services',
  catalogueCounts('salon', [{ unit: 'session' }, { unit: 'session' }]).services, 2)
eq('a shop that sells both kinds gets both counted',
  JSON.stringify(catalogueCounts('phone_repair', [{ unit: 'session' }, { unit: 'walk_in' }])),
  JSON.stringify({ services: 1, products: 1 }))
eq('an empty parse counts as nothing of either kind',
  JSON.stringify(catalogueCounts('cafe', [])), JSON.stringify({ services: 0, products: 0 }))
// With zero rows there is no unit to route by, so the zero-case label falls
// back to the business type's own sells: a cafe with an empty parse is still
// a product-selling shop, not a services shop with an empty roster.
eq('a cafe with nothing parsed yet is still told about products', catalogueZeroKind('cafe'), 'product')
eq('a salon with nothing parsed yet is told about services', catalogueZeroKind('salon'), 'service')
eq('a shop that sells both leads with products for the zero case, same as product-list.tsx', catalogueZeroKind('phone_repair'), 'product')
eq('an unknown business type defaults to both, so it leads with products too', catalogueZeroKind('not_a_real_type'), 'product')

console.log('\na cafe\'s menu is filed where a menu belongs')
// Before this, persist.ts wrote every row to services and the word "product"
// did not appear in the file. That is why a real cafe's published page showed
// no photographs: not a rendering bug, an unreachable feature. db/seed.sql's
// own cafe (B_COFFEE) is seeded directly into products, which is the shape
// setup/persist.ts now produces on its own: this pins that shape so nobody
// re-seeds a walk-in menu into services again, the exact regression this
// whole phase exists to close.
const cafeProducts = await one(db, `select count(*) c from products where business_id = '${B_COFFEE}' and active`)
const cafeWalkInServices = await one(db, `select count(*) c from services where business_id = '${B_COFFEE}' and active and unit = 'walk_in'`)
eq('a cafe has product rows', Number(cafeProducts.c) > 0, true)
eq('and no walk-in row was left behind in services', Number(cafeWalkInServices.c), 0)
// A plain salon is untouched by all of this: it sells time only, so it must
// never carry a product, on any table's terms. B_SALON itself is not the
// witness here: it already carries one deliberately seeded retail item from
// the "one view, two kinds" check above, so a zero there would prove nothing.
// B_NEW is a salon business type nobody has ever given a catalogue at all,
// which is the honest way to ask "did a salon leak a product".
const salonProducts = await one(db, `select count(*) c from products where business_id = '${B_NEW}'`)
eq('a salon has no products at all', Number(salonProducts.c), 0)

console.log('\nno backfill may move a row a customer is holding')
// A booking's service_id is a real commitment to a real person. Moving that row
// either breaks the foreign key or orphans the booking, so a booked row is
// refused and REPORTED. A silent skip is how a half migrated catalogue happens.
eq('an unbooked walk-in row on a cafe is movable',
  movePlan({ businessType: 'cafe', unit: 'walk_in', bookingCount: 0 }).move, true)
eq('the same row with one booking is refused',
  movePlan({ businessType: 'cafe', unit: 'walk_in', bookingCount: 1 }).move, false)
eq('and the refusal names its reason',
  movePlan({ businessType: 'cafe', unit: 'walk_in', bookingCount: 1 }).reason, 'booked')
eq('a salon row is never moved, booked or not',
  movePlan({ businessType: 'salon', unit: 'walk_in', bookingCount: 0 }).move, false)
eq('and that refusal names a different reason',
  movePlan({ businessType: 'salon', unit: 'walk_in', bookingCount: 0 }).reason, 'already correct')

console.log('\nplanCatalogue: the routing fix, provable without a live database')
// persist.ts carries `server-only` and a live Supabase client, so nothing
// above this line ever calls it: the seed-shape checks just now can prove
// the FIXTURE is right, not that the reconciliation code stays right. This
// is what closes that gap. `planCatalogue` decides everything (the split by
// kind, the name matching, the field mapping, what retires) with no database
// call inside it, so it runs here exactly as persist.ts calls it.
const row = (overrides) => ({
  name: 'Item', name_en: null, description: null, price_minor: 1000, currency: 'KHR',
  unit: 'walk_in', duration_min: 30, buffer_min: 0, capacity: 1, requires_deposit: false,
  deposit_minor: null, ...overrides,
})

// The exact carried key set. A cappuccino has no duration and nothing books
// against it, so a booking field surviving into a product row would be a
// silent regression, not a loud one: nothing downstream reads it, so nothing
// would ever complain until an owner asked why her drink has a buffer time.
const cappuccino = row({
  name: 'Cappuccino', name_en: 'Cappuccino', description: 'Hot, with milk', price_minor: 4500,
  duration_min: 45, buffer_min: 10, capacity: 3, requires_deposit: true, deposit_minor: 1000,
})
const mappingPlan = planCatalogue('cafe', [cappuccino], [], [])
eq('a brand new walk-in row is a fresh product insert', mappingPlan.products.inserts.length, 1)
const insertedProduct = mappingPlan.products.inserts[0]
eq('the carried keys are exactly the ones a product row has, nothing more',
  Object.keys(insertedProduct).sort().join(','),
  ['name', 'name_en', 'description', 'price_minor', 'currency', 'active', 'sort_order'].sort().join(','))
eq('duration is dropped, not just unused', 'duration_min' in insertedProduct, false)
eq('capacity is dropped', 'capacity' in insertedProduct, false)
eq('the deposit fields are dropped', 'deposit_minor' in insertedProduct, false)

// The kind-change guarantee: a row whose unit flips between two parses must
// leave its old table, or v_catalog lists it twice on the shop's public menu.
// A restaurant sells both, so the same name can cross from booked to walk-in.
const kindChangePlan = planCatalogue(
  'restaurant',
  [row({ name: 'Table for two', unit: 'walk_in' })],
  [{ id: 'svc-1', name: 'Table for two', active: true }],
  [],
)
eq('a row that flips from booked to walk-in retires its old service row',
  kindChangePlan.services.deactivate.join(','), 'svc-1')
eq('it is never matched as a service update: the name match is table-scoped',
  kindChangePlan.services.updates.length, 0)
eq('and it lands as a fresh product insert, not a migrated id', kindChangePlan.products.inserts.length, 1)

// Finding: setup used to retire a product the way it retires a service. A
// salon's service list IS its description of itself, so a name the
// description stops mentioning is a real retirement. A product is inventory
// with its own photograph, stock count and category, kept from a different
// screen (`/app/products`, `createProduct`, `create_products_bulk`) that a
// re-parse of the shop's DESCRIPTION never sees, and `ShopSetup` is mounted
// in secondary-tools.tsx, reachable at any time, not only at onboarding. An
// owner who builds a photographed menu and then only edits her hours in the
// description screen must never come back to find that menu emptied.
const survivorPlan = planCatalogue('cafe', [], [], [{ id: 'prod-1', name: 'Cake', active: true }])
eq('a re-parse that drops a product from the description queues no deactivation',
  survivorPlan.products.deactivate.length, 0)
eq('and queues no update either: an unmentioned product is left alone entirely',
  survivorPlan.products.updates.length, 0)

console.log('\nsetup will not retire a product, and must not resurrect one either')
// The mirror of the finding above, and the same principle read backwards.
// `active: true` was hardcoded on the product update, so re-saving a shop
// description silently un-archived an item the owner had deliberately
// archived. "Hers to do, visible and reversible" is worth nothing if the next
// description save undoes it, so the update carries no `active` at all and
// only an insert sets one.
const archivedPlan = planCatalogue(
  'cafe',
  [row({ name: 'Cappuccino', unit: 'walk_in', price_minor: 4000 })],
  [],
  [{ id: 'prod-1', name: 'Cappuccino', active: false }],
)
eq('an archived product still matches by name', archivedPlan.products.updates.length, 1)
eq('and the update does not carry active at all',
  Object.prototype.hasOwnProperty.call(archivedPlan.products.updates[0].values, 'active'), false)

console.log('\na booking becomes an event without moving in time or losing its money')
const range = {
  date: '2026-09-03',
  start: '2026-09-03T01:00:00.000Z',
  end: '2026-09-03T13:00:00.000Z',
  resources: [
    { id: 'r-1', name: 'Chair 1', kind: 'chair' },
    { id: 'r-2', name: 'Chair 2', kind: 'chair' },
  ],
  bookings: [
    { id: 'b-1', code: 'AB12CD', status: 'confirmed', startsAt: '2026-09-03T02:00:00.000Z', endsAt: '2026-09-03T02:30:00.000Z', customer: 'Sokha', service: 'Haircut', resourceId: 'r-1', channel: 'telegram', priceMinor: 15000, paidMinor: 0, currency: 'KHR' },
    { id: 'b-2', code: 'EF34GH', status: 'confirmed', startsAt: '2026-09-03T03:00:00.000Z', endsAt: '2026-09-03T03:30:00.000Z', customer: 'Dara', service: 'Shave', resourceId: null, channel: 'walk_in', priceMinor: 5000, paidMinor: 5000, currency: 'KHR' },
  ],
}
const events = toCalendarEvents(range)
eq('every booking becomes an event', events.length, 2)
// The single most damaging thing a calendar can do is show the wrong hour. The
// database stores UTC; the shop reads Phnom Penh, which is UTC+7 with no DST.
// 02:00Z is 09:00 in the shop.
eq('a booking is rendered in Phnom Penh time, not UTC', events[0].start.includes('09:00'), true)
eq('and its end moves with it', events[0].end.includes('09:30'), true)
// A booking with no resource must still appear. Hiding it would lose a real
// customer from the owner's day.
eq('a booking with no resource still becomes an event', events[1].calendarId, 'unassigned')
eq('a booking with a resource takes that resource as its calendar', events[0].calendarId, 'r-1')
// Money goes through formatMoney, never a float and never a raw minor unit.
eq('the money reads as money', events[0].title.includes(formatMoney(15000, 'KHR')), true)
// Every resource gets its own calendar, plus the neutral one, so a colour means
// exactly one chair.
const calendars = calendarsFor(range.resources)
eq('each resource is its own calendar', Object.keys(calendars).length, 3)
eq('and the neutral one exists for unassigned bookings', 'unassigned' in calendars, true)

console.log('\nthe agent panel offers what the shop is missing, not a taxonomy')
// The four tabs this replaces never left the browser: /api/ask is posted the
// text and nothing else, so the owner was filing her request for an audience of
// nobody, then being shown a loading line that claimed the filing had mattered.
// These are the rules that took their place, and every one of them decides a
// row she taps, so every one of them is asserted here.
const READY_SHOP = {
  sells: 'goods',
  catalogueCount: 8,
  productCount: 8,
  photoCount: 8,
  hasPaymentAccount: true,
  hasLiveChannel: true,
}
const readyRows = askSuggestions(READY_SHOP)
eq('a shop missing nothing is still offered its day', readyRows.length, 3)
eq('and it leads with the day rather than inventing a warning', readyRows[0].id, 'day')
eq('nothing offered to a finished shop can change it', readyRows.every((row) => !row.writes), true)
// The same shop must give the same rows in the same order. A row that moves
// under her thumb is a row she stops trusting, and it is also how the sentence
// she meant to send becomes the one underneath it.
eq('the same shop state gives the same rows in the same order',
  JSON.stringify(askSuggestions(READY_SHOP)), JSON.stringify(readyRows))

const emptyCafe = askSuggestions({ ...READY_SHOP, catalogueCount: 0, productCount: 0, photoCount: 0 })
eq('an empty catalogue outranks every other need', emptyCafe[0].id, 'catalogue')
eq('and a cafe is asked for a menu', emptyCafe[0].text.includes('ម៉ឺនុយ'), true)
const emptySalon = askSuggestions({ ...READY_SHOP, sells: 'time', catalogueCount: 0, productCount: 0, photoCount: 0 })
eq('a salon is asked for services, never for a menu', emptySalon[0].text.includes('សេវាកម្ម'), true)

const noPhotos = askSuggestions({ ...READY_SHOP, photoCount: 0 })
eq('a menu with no pictures is offered pictures', noPhotos[0].id, 'photos')
// A service cannot hold a photo: v_catalog reports its photo_path as null by
// construction. So a shop with nothing to photograph must never be told to.
const salonNoProducts = askSuggestions({ ...READY_SHOP, sells: 'time', productCount: 0, photoCount: 0 })
eq('a shop with nothing to photograph is never asked for a photograph',
  salonNoProducts.some((row) => row.id === 'photos'), false)

const unpaid = askSuggestions({ ...READY_SHOP, hasPaymentAccount: false })
eq('a shop that cannot be paid is offered its own Bakong account', unpaid[0].id, 'payment')
eq('and that row asks her first, because it writes to the shop', unpaid[0].writes, true)

// A brand new shop is short of everything. It still may not be three warnings:
// she has a day to run today, whatever else is unfinished.
const brandNew = askSuggestions({
  sells: 'both',
  catalogueCount: 0,
  productCount: 0,
  photoCount: 0,
  hasPaymentAccount: false,
  hasLiveChannel: false,
})
eq('a shop missing everything is not buried in its own warnings', brandNew.length, 3)
// Named, not counted. "At least one row that does not write" passes on the
// setup-status row, which is a warning wearing a question mark: the assertion
// has to say that her DAY survives, because that is the row being protected.
eq('and it keeps the one row she runs every morning',
  brandNew.some((row) => row.id === 'day'), true)
eq('no row is offered twice', new Set(brandNew.map((row) => row.id)).size, 3)


// ── 40. the shop site takes money (PLAN.md Phase 13) ───────────────────────
// The whole rail, against a real Postgres. The route above it is HTTP plumbing;
// everything below is the part that can lose a shop money.
console.log('\nthe shop site takes money')

const B_MENU = 'b0000000-0000-4000-8000-0000000000a1'
const P_ICED = 'e3000000-0000-4000-8000-0000000000a1'
const P_TEA  = 'e3000000-0000-4000-8000-0000000000a2'
await db.exec(`
  insert into businesses (id, slug, name, business_type, default_currency)
   values ('${B_MENU}', 'phase13-cafe', 'ហាងកាហ្វេ ១៣', 'cafe', 'KHR');
  insert into products (id, business_id, name, price_minor, currency, stock) values
   ('${P_ICED}', '${B_MENU}', 'កាហ្វេទឹកកក', 6000, 'KHR', 5),
   ('${P_TEA}',  '${B_MENU}', 'ទឹកតែ',        1000, 'KHR', null);
  insert into storefronts (id, theme, draft)
   values ('${B_MENU}', 'counter', '{"theme":"counter"}'::jsonb)`)

// The publish gate, driven with the REAL rows the route reads. A draft is not a
// site: a shop that never pressed publish must 404 on its page AND refuse an
// order, from the same predicate, or the two will disagree.
const menuBusiness = await one(db, `select id, name, default_currency from businesses where id = '${B_MENU}'`)
const draftOnly = await one(db, `select published from storefronts where id = '${B_MENU}'`)
eq('a shop with a draft and nothing published takes no orders', publishedShopFrom(menuBusiness, draftOnly), null)
await db.exec(`update storefronts set published = draft, published_at = now() where id = '${B_MENU}'`)
const nowLive = await one(db, `select published from storefronts where id = '${B_MENU}'`)
eq('once she publishes, the same lookup finds the shop',
  publishedShopFrom(menuBusiness, nowLive)?.businessId, B_MENU)
eq('a slug that matches no shop is nothing, not a guess', publishedShopFrom(null, nowLive), null)
eq('and a shop with no storefront row at all is nothing', publishedShopFrom(menuBusiness, null), null)

// A public order writes all four rows. `tx` is the same real-Postgres seam the
// route hands `createOrder` in production.
const webOrder = await createOrder(tx, {
  businessId: B_MENU, customerId: null, channel: 'web',
  lines: [{ productId: P_ICED, quantity: 2 }, { productId: P_TEA, quantity: 1 }],
})
eq('a public order totals from the catalogue', webOrder.totalMinor, 6000 * 2 + 1000)
const written = await one(db, `select
  (select count(*) from order_items where order_id = '${webOrder.orderId}') items,
  (select count(*) from invoices    where order_id = '${webOrder.orderId}') invoices,
  (select channel from orders where id = '${webOrder.orderId}') channel`)
eq('it writes its lines', Number(written.items), 2)
eq('and its invoice', Number(written.invoices), 1)
eq('and it is recorded as a web order, which is what the expiry job keys on', written.channel, 'web')

// FAULT INJECTION 1. The client cannot name its own price. Extra fields are
// carried on the line exactly as a hostile caller would send them; the row the
// shop is paid on must still carry the catalogue's number.
const spoofed = await createOrder(tx, {
  businessId: B_MENU, customerId: null, channel: 'web',
  lines: [{ productId: P_ICED, quantity: 1, price_minor: 1, unit_price_minor: 1, priceMinor: 1, lineTotalMinor: 1 }],
})
eq('a client-sent price is ignored and the line is priced from the catalogue', spoofed.lines[0].unitPriceMinor, 6000)
const spoofedRow = await one(db, `select unit_price_minor, line_total_minor from order_items where order_id = '${spoofed.orderId}'`)
eq('and the stored line carries the catalogue price, not the one on the wire', spoofedRow.unit_price_minor, 6000)
eq('so the total the shop is paid is the catalogue total', spoofed.totalMinor, 6000)

// Tenancy at the till, on the PUBLIC path. A product id copied out of another
// shop's page is not orderable here, however it was obtained: `createOrder`
// scopes every read to the business the SLUG resolved to.
let publicCrossTenant = 'ALLOWED'
try {
  await createOrder(tx, { businessId: B_MENU, customerId: null, channel: 'web',
    lines: [{ productId: 'e0000000-0000-4000-8000-000000000003', quantity: 1 }] })
} catch (e) { publicCrossTenant = e instanceof OrderError ? e.code : 'other' }
eq('a product id from another shop is not orderable through this shop\'s site', publicCrossTenant, 'unknown_product')

// Out of stock is its own code, because the customer can act on it.
let publicOversell = 'ALLOWED'
try {
  await createOrder(tx, { businessId: B_MENU, customerId: null, channel: 'web',
    lines: [{ productId: P_ICED, quantity: 99 }] })
} catch (e) { publicOversell = e instanceof OrderError ? e.code : 'other' }
eq('too many of something returns the out-of-stock code, not a generic failure', publicOversell, 'out_of_stock')

console.log('\nwhat a refused order says to a customer')
const REFUSALS = ['empty', 'unknown_product', 'out_of_stock', 'mixed_currency']
eq('every refusal has a Khmer sentence a customer can read',
  REFUSALS.every((code) => /[ក-៿]/.test(orderErrorKm(code))), true)
eq('and no two of them say the same thing', new Set(REFUSALS.map(orderErrorKm)).size, 4)
eq('an unknown code still reads as a sentence rather than an empty box',
  /[ក-៿]/.test(orderErrorKm('something_new')), true)
eq('out of stock is a well formed request the world moved under, so 409', orderErrorStatus('out_of_stock'), 409)
eq('the rest are the caller\'s, so 400', orderErrorStatus('unknown_product'), 400)

console.log('\npayments can pay for goods')
await expectFail(db, 'a payment cannot name an order that does not exist',
  `insert into payments (business_id, order_id, amount_minor, currency, status, idempotency_key)
   values ('${B_MENU}', 'ffffffff-0000-4000-8000-00000000dead', 1000, 'KHR', 'pending', 'fk-test')`,
  'payments_order_id_fkey')

// The accounting claim: a deleted order must not take the record of money with
// it. `on delete set null`, never cascade.
const D_ORDER = (await one(db, `insert into orders (business_id, channel, total_minor, currency)
  values ('${B_MENU}', 'web', 1000, 'KHR') returning id`)).id
await db.exec(`insert into payments (id, business_id, order_id, amount_minor, currency, status, idempotency_key)
  values ('e4000000-0000-4000-8000-0000000000d1', '${B_MENU}', '${D_ORDER}', 1000, 'KHR', 'pending', 'delete-test')`)
await db.exec(`delete from orders where id = '${D_ORDER}'`)
const orphan = await one(db, `select order_id from payments where id = 'e4000000-0000-4000-8000-0000000000d1'`)
eq('deleting an order does not delete the record that money was asked for', orphan.order_id, null)

// The metering coincidence, asserted rather than shrugged at. `v_month_usage`
// counts a paid payment with a NULL booking_id as a standalone sale, which is
// exactly what an order payment is. It is correct by coincidence and a later
// edit could break it silently.
const usageBefore = await one(db, `select txn_used from v_month_usage where business_id = '${B_MENU}'`)
eq('the new shop has metered nothing yet', Number(usageBefore.txn_used), 0)
await db.exec(`insert into payments (business_id, order_id, booking_id, amount_minor, currency, provider, status, paid_at, idempotency_key)
  values ('${B_MENU}', '${webOrder.orderId}', null, ${webOrder.totalMinor}, 'KHR', 'khqr', 'paid', now(), '${webOrder.code}:order:paid')`)
const usageAfter = await one(db, `select txn_used from v_month_usage where business_id = '${B_MENU}'`)
eq('a paid order payment meters as a standalone sale, with no change to the view', Number(usageAfter.txn_used), 1)

console.log('\ngiving the stock back')
// FAULT INJECTION 2. `createOrder` takes stock at order time, which on a public
// page lets anybody drain a shop for free. A lapsed web order must give back
// EXACTLY what it took, and must not invent a number for an uncounted product.
const runner = (work) => work(tx)
const beforeLapse = Number((await one(db, `select stock from products where id = '${P_ICED}'`)).stock)
const lapsing = await createOrder(tx, {
  businessId: B_MENU, customerId: null, channel: 'web',
  lines: [{ productId: P_ICED, quantity: 2 }, { productId: P_TEA, quantity: 3 }],
})
const duringLapse = Number((await one(db, `select stock from products where id = '${P_ICED}'`)).stock)
eq('the order took its stock at order time, as it does on every channel', beforeLapse - duringLapse, 2)
await db.exec(`insert into payments (business_id, order_id, amount_minor, currency, provider, status, expires_at, idempotency_key)
  values ('${B_MENU}', '${lapsing.orderId}', ${lapsing.totalMinor}, 'KHR', 'khqr', 'pending', now() - interval '10 minutes', '${lapsing.code}:order:0')`)

const dueOrders = await findExpiredWebOrders(tx, new Date())
eq('the job sees exactly the one lapsed web order', dueOrders.length, 1)
const expiry = await expireWebOrders(runner, { now: new Date() })
eq('and cancels it', expiry.cancelled, 1)
const afterLapse = Number((await one(db, `select stock from products where id = '${P_ICED}'`)).stock)
eq('the stock the order took comes back, exactly', afterLapse, beforeLapse)
const uncountedAfter = await one(db, `select stock from products where id = '${P_TEA}'`)
eq('and an uncounted product is left uncounted, never given a number', uncountedAfter.stock, null)
const lapsedRows = await one(db, `select
  (select status from orders   where id = '${lapsing.orderId}') o,
  (select status from payments where order_id = '${lapsing.orderId}') p,
  (select count(*) from invoices where order_id = '${lapsing.orderId}') inv`)
eq('the order is cancelled', lapsedRows.o, 'cancelled')
eq('its payment is expired', lapsedRows.p, 'expired')
// Invoice numbers are gapless per business by design. Deleting one to tidy up a
// cancelled order is an accounting problem, not housekeeping.
eq('and its invoice row is left exactly where it was', Number(lapsedRows.inv), 1)

const secondSweep = await expireWebOrders(runner, { now: new Date() })
eq('a second sweep finds nothing and gives nothing back twice', secondSweep.cancelled, 0)

// The scope that makes this job safe. A Telegram order is being shepherded by
// an agent in a live conversation and must not be cancelled underneath it.
const tgOrder = await createOrder(tx, {
  businessId: B_MENU, customerId: null, channel: 'telegram',
  lines: [{ productId: P_ICED, quantity: 1 }],
})
await db.exec(`insert into payments (business_id, order_id, amount_minor, currency, provider, status, expires_at, idempotency_key)
  values ('${B_MENU}', '${tgOrder.orderId}', ${tgOrder.totalMinor}, 'KHR', 'khqr', 'pending', now() - interval '10 minutes', '${tgOrder.code}:order:0')`)
const tgSweep = await expireWebOrders(runner, { now: new Date() })
eq('a pending Telegram order is not cancelled underneath its agent', tgSweep.cancelled, 0)
const tgStatus = await one(db, `select status from orders where id = '${tgOrder.orderId}'`)
eq('it is still pending, and its stock is still taken', tgStatus.status, 'pending')

// Newest payment, not any payment. An order whose first QR lapsed and which was
// then issued a fresh one has a live QR and a customer in front of it.
const reissued = await createOrder(tx, {
  businessId: B_MENU, customerId: null, channel: 'web',
  lines: [{ productId: P_ICED, quantity: 1 }],
})
await db.exec(`insert into payments (business_id, order_id, amount_minor, currency, provider, status, expires_at, idempotency_key, created_at) values
  ('${B_MENU}', '${reissued.orderId}', ${reissued.totalMinor}, 'KHR', 'khqr', 'pending', now() - interval '10 minutes', '${reissued.code}:order:0', now() - interval '10 minutes'),
  ('${B_MENU}', '${reissued.orderId}', ${reissued.totalMinor}, 'KHR', 'khqr', 'pending', now() + interval '5 minutes',  '${reissued.code}:order:1', now())`)
const reissueSweep = await expireWebOrders(runner, { now: new Date() })
eq('an order whose QR was reissued is not cancelled out from under a live one', reissueSweep.cancelled, 0)

console.log('\none code, two things')
// Booking codes and order codes come from different generators over the same
// alphabet. `confirmPayment` moves money, so a collision must be an outcome and
// never a winner picked at random.
eq('a code that names a booking and an order is ambiguous', confirmTarget({ id: 'b' }, { id: 'o' }).kind, 'ambiguous')
eq('a booking alone confirms the booking', confirmTarget({ id: 'b' }, null).kind, 'booking')
eq('an order alone confirms the order', confirmTarget(null, { id: 'o' }).kind, 'order')
eq('neither is not found, which is not the same as ambiguous', confirmTarget(null, null).kind, 'none')

// The same rule against real rows: one business, one code, two tables.
const COLLIDE = 'ZZ9Q7X'
await db.exec(`
  insert into orders (business_id, code, channel, total_minor, currency)
   values ('${B_MENU}', '${COLLIDE}', 'web', 6000, 'KHR');
  insert into services (id, business_id, name, duration_min, price_minor, currency)
   values ('50000000-0000-4000-8000-000000013b01', '${B_MENU}', 'សាកល្បង', 30, 6000, 'KHR');
  insert into resources (id, business_id, name, kind)
   values ('a0000000-0000-4000-8000-000000013b01', '${B_MENU}', 'តុ', 'table');
  insert into customers (id, business_id, display_name)
   values ('d0000000-0000-4000-8000-000000013b01', '${B_MENU}', 'សុខា');
  insert into bookings (business_id, service_id, resource_id, customer_id, code, starts_at, ends_at, price_minor, currency)
   values ('${B_MENU}', '50000000-0000-4000-8000-000000013b01', 'a0000000-0000-4000-8000-000000013b01',
           'd0000000-0000-4000-8000-000000013b01', '${COLLIDE}', now() + interval '1 day', now() + interval '1 day 30 minutes', 6000, 'KHR')`)
const collidedBooking = await one(db, `select id from bookings where business_id = '${B_MENU}' and code = '${COLLIDE}'`)
const collidedOrder = await one(db, `select id from orders where business_id = '${B_MENU}' and code = '${COLLIDE}'`)
eq('a real collision in one shop resolves to ambiguous, not to whichever was read first',
  confirmTarget(collidedBooking, collidedOrder).kind, 'ambiguous')

// The owner's confirmation of an ORDER payment, as the SQL confirm.ts runs.
// Scoped to pending, so a second tap changes zero rows and says so.
const toConfirm = await createOrder(tx, {
  businessId: B_MENU, customerId: null, channel: 'web',
  lines: [{ productId: P_TEA, quantity: 2 }],
})
await db.exec(`insert into payments (id, business_id, order_id, amount_minor, currency, provider, provider_account, status, idempotency_key)
  values ('e4000000-0000-4000-8000-0000000000c1', '${B_MENU}', '${toConfirm.orderId}', ${toConfirm.totalMinor}, 'KHR', 'khqr', 'cafe@wing', 'pending', '${toConfirm.code}:order:confirm')`)
const firstOrderConfirm = await db.query(`update payments set status = 'paid', paid_at = now(), provider_txn_id = 'owner-confirmed'
  where id = 'e4000000-0000-4000-8000-0000000000c1' and business_id = '${B_MENU}' and status = 'pending' returning id`)
eq('the owner confirming an order moves exactly one pending row', firstOrderConfirm.rows.length, 1)
const secondOrderConfirm = await db.query(`update payments set status = 'paid', paid_at = now()
  where id = 'e4000000-0000-4000-8000-0000000000c1' and business_id = '${B_MENU}' and status = 'pending' returning id`)
eq('and a second tap moves nothing, which is what already_paid reports', secondOrderConfirm.rows.length, 0)
const orderConfirmed = await db.query(`update orders set status = 'confirmed'
  where id = '${toConfirm.orderId}' and business_id = '${B_MENU}' and status = 'pending' returning id`)
eq('the order goes pending to confirmed in the same step', orderConfirmed.rows.length, 1)
// A confirmed order is no longer pending, so the expiry job cannot reach it.
const afterConfirmSweep = await expireWebOrders(runner, { now: new Date() })
eq('a confirmed order is never cancelled by the expiry job', afterConfirmSweep.cancelled, 0)


// ── result ────────────────────────────────────────────────────────────────
console.log(`\n${fail === 0 ? '\x1b[32m' : '\x1b[31m'}${pass} passed, ${fail} failed\x1b[0m\n`)
process.exit(fail === 0 ? 0 : 1)
