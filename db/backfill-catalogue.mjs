#!/usr/bin/env node
/**
 * Moves a wrongly filed catalogue row from `services` to `products`.
 *
 * `src/lib/setup/persist.ts` used to write every parsed row to `services`, so a
 * business whose `catalogKindFor` says a row belongs in `products` (a cafe's
 * menu, chiefly) got it filed in the wrong table anyway. New shops route
 * correctly the moment persist.ts shipped; this script is the one time repair
 * for shops that already existed when it did, which includes the only
 * published shop there is.
 *
 * Deliberate and never invoked on boot:
 *   npm run db:backfill                  # dry run, the default, changes nothing
 *   node db/backfill-catalogue.mjs --write   # the real move
 *
 * Reads go through the Supabase service role client, the same credential
 * src/lib/db.ts uses, because a SELECT needs no transaction. The move itself
 * does: PostgREST cannot run one, and moving a row is an insert into products
 * plus a delete from services that must succeed or fail together, or a crash
 * mid run leaves a shop with a menu item in both tables or in neither. That is
 * exactly why src/lib/orders/connection.ts exists for orders, and why this
 * script opens its own direct Postgres connection, one transaction per
 * business, only when --write is passed.
 *
 * `src/lib/db.ts` and `src/lib/orders/connection.ts` both carry `import
 * 'server-only'`, which throws outside Next's react-server condition: exactly
 * the trap CLAUDE.md documents for db/test.mjs. This script is plain Node, so
 * it builds its own clients the way scripts/mvp-acceptance.mjs already does,
 * rather than importing either file.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'
import { movePlan } from '../src/lib/catalogue/backfill.ts'

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))

// A minimal .env.local reader, deliberately duplicated from
// scripts/mvp-acceptance.mjs rather than shared: this file has no import of
// its own to lend, and pulling in a whole script for one function would be a
// stranger dependency than fifteen duplicated lines.
function parseEnvFile(text) {
  const parsed = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    parsed[match[1]] = value
  }
  return parsed
}

function loadLocalEnv() {
  try {
    const local = parseEnvFile(readFileSync(path.join(projectRoot, '.env.local'), 'utf8'))
    for (const [key, value] of Object.entries(local)) {
      if (!process.env[key]) process.env[key] = value
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
}

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function supabaseClient() {
  return createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } },
  )
}

/**
 * One row of `services`, plus the booking count `movePlan` needs to decide it.
 * `bookingCount` counts every status, cancelled and no_show included: the
 * safety rule is about the foreign key existing, not about whether the
 * booking still matters to anyone. A cancelled booking still points at this
 * row, and deleting the row out from under it is exactly what the FK refuses.
 */
async function candidatesFor(supabase, business) {
  const servicesResult = await supabase
    .from('services')
    .select('id, name, name_en, description, price_minor, currency, unit, active, sort_order')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('sort_order')
  if (servicesResult.error) {
    throw new Error(`loading services for ${business.slug}: ${servicesResult.error.message}`)
  }

  // One query for every booking on this business, not one query per service:
  // a business with a dozen services should not cost a dozen round trips to
  // learn whether any of them are booked.
  const bookingsResult = await supabase
    .from('bookings')
    .select('service_id')
    .eq('business_id', business.id)
  if (bookingsResult.error) {
    throw new Error(`loading bookings for ${business.slug}: ${bookingsResult.error.message}`)
  }
  const bookingCounts = new Map()
  for (const row of bookingsResult.data ?? []) {
    bookingCounts.set(row.service_id, (bookingCounts.get(row.service_id) ?? 0) + 1)
  }

  return (servicesResult.data ?? [])
    .map((service) => {
      const bookingCount = bookingCounts.get(service.id) ?? 0
      return { service, bookingCount, plan: movePlan({ businessType: business.business_type, unit: service.unit, bookingCount }) }
    })
    // A row that stays a service is not a candidate for anything: it is not
    // moved and it is not skipped, it is simply correct, and printing it every
    // run would bury the one signal an operator needs (a booked row) under
    // every ordinary service a normal shop has.
    .filter((row) => row.plan.reason !== 'already correct')
}

function productValuesFor(service) {
  // Exactly the carried set from the task brief, no more. duration_min,
  // buffer_min, capacity, requires_deposit and deposit_minor are dropped, not
  // carried as null: a cappuccino has no duration and nothing books against
  // it, and products has no columns for them regardless. stock, category,
  // photo_path and photo_alt are left null: the shop never told us a count, a
  // grouping or a picture, and null on stock means unlimited, which is the
  // honest default for a row that has never been counted.
  return {
    name: service.name,
    name_en: service.name_en,
    description: service.description,
    price_minor: service.price_minor,
    currency: service.currency,
    active: service.active,
    sort_order: service.sort_order,
  }
}

/**
 * Moves every movable row of one business inside one transaction, so a crash
 * partway through never leaves the row in both tables or in neither.
 *
 * The delete is guarded by NOT EXISTS against bookings at the moment of the
 * write, not only at the moment of the read: the read and the write are
 * separated by however long the earlier businesses in this run took, and a
 * customer can book in that window. The guard turns that race into a loud
 * failure (the delete affects zero rows, so the transaction throws and rolls
 * back) instead of a silent foreign key violation or, worse, a successful
 * delete of a now-booked row on a database with a looser constraint.
 */
async function moveBusiness(sql, business, movable) {
  await sql.begin(async (tx) => {
    for (const { service } of movable) {
      const values = productValuesFor(service)
      await tx`
        insert into products (business_id, name, name_en, description, price_minor, currency, active, sort_order)
        values (${business.id}, ${values.name}, ${values.name_en}, ${values.description}, ${values.price_minor}, ${values.currency}, ${values.active}, ${values.sort_order})
      `
      const deleted = await tx`
        delete from services
        where id = ${service.id}
          and business_id = ${business.id}
          and not exists (select 1 from bookings where bookings.service_id = services.id)
        returning id
      `
      if (deleted.length !== 1) {
        throw new Error(
          `${business.slug}: "${service.name}" gained a booking since it was checked. Rolling back this business; nothing else moved.`,
        )
      }
    }
  })
}

async function main() {
  loadLocalEnv()
  const args = process.argv.slice(2)
  // An explicit --dry-run always wins, even alongside --write: this is the one
  // script in the repo that deletes real rows a customer's booking may depend
  // on, and the failure mode this whole task exists to prevent is a write that
  // ran before a human meant it to.
  const write = args.includes('--write') && !args.includes('--dry-run')
  console.log(`Moni catalogue backfill (${write ? 'WRITE, this will change the database' : 'dry run, no changes will be made'})\n`)

  // Fail before a single network call if a write was asked for but the one
  // connection that can honour it safely is not configured, rather than
  // reading the whole database only to error out afterward.
  let sql
  if (write) {
    sql = postgres(requiredEnv('DATABASE_URL'), { prepare: false, max: 1 })
  }

  const supabase = supabaseClient()
  const businessesResult = await supabase.from('businesses').select('id, slug, business_type').order('slug')
  if (businessesResult.error) throw new Error(`loading businesses: ${businessesResult.error.message}`)
  const businesses = businessesResult.data ?? []

  let totalMoved = 0
  let totalSkipped = 0
  let anyBusinessFailed = false

  try {
    for (const business of businesses) {
      const candidates = await candidatesFor(supabase, business)
      const movable = candidates.filter((row) => row.plan.reason === 'movable')
      const booked = candidates.filter((row) => row.plan.reason === 'booked')

      console.log(`${business.slug} (${business.business_type})`)
      for (const { service } of movable) {
        console.log(`  move  ${service.name.padEnd(24)}  0 bookings`)
      }
      for (const { service, bookingCount } of booked) {
        console.log(`  SKIP  ${service.name.padEnd(24)}  booked, ${bookingCount} booking${bookingCount === 1 ? '' : 's'}`)
      }

      if (write && movable.length > 0) {
        try {
          await moveBusiness(sql, business, movable)
        } catch (error) {
          anyBusinessFailed = true
          console.log(`  FAILED to move ${business.slug}: ${error.message}`)
          console.log(`  ${business.slug}: 0 moved, ${candidates.length} skipped (business rolled back)`)
          totalSkipped += candidates.length
          continue
        }
      }

      console.log(`  ${business.slug}: ${movable.length} moved, ${booked.length} skipped\n`)
      totalMoved += movable.length
      totalSkipped += booked.length
    }
  } finally {
    if (sql) await sql.end()
  }

  console.log(`${businesses.length} business${businesses.length === 1 ? '' : 'es'} checked: ${totalMoved} moved, ${totalSkipped} skipped`)
  if (write) {
    console.log(totalMoved > 0 ? 'Rows were moved for real.' : 'Nothing needed moving.')
  } else {
    console.log('Nothing was changed. Re-run with --write once a human has reviewed this plan.')
  }

  if (totalSkipped > 0 || anyBusinessFailed) {
    console.log('\nSomething was skipped or failed. Look before running again: a half migrated catalogue is worse than a filed-wrong one.')
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error.stack ?? String(error))
  process.exitCode = 1
})
