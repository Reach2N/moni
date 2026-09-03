import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types.ts'

/**
 * The generated row types, straight from the live schema.
 *
 * When `db/schema.sql` grows a column the live project has not been migrated to
 * yet, this import points at a tiny hand-written OVERLAY instead, never at an
 * edited copy of the generated file. `payments.order_id` spent 3 September 2026
 * in exactly that state: `database.pending.ts` named the one column, the
 * migration was applied, the types were regenerated, and the overlay deleted
 * itself the same day.
 *
 * Reopen that pattern rather than hand editing `database.types.ts`, which is
 * generated and is never edited. An overlay says in twelve lines what it is
 * promising; a copied file has to be diffed to find out.
 */
type Db = Database

function requiredServerEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY') {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required server environment variable: ${name}`)
  return value
}

/**
 * Server-only Supabase client using the service role key.
 *
 * Service role bypasses RLS. Since 27 August 2026 RLS is ON for every table
 * with zero policies (deny by default), so this client is the ONLY way in:
 * the anon key can do nothing until the Clerk member policies land (PLAN.md
 * Phase 2). Every caller is a route handler we control. The `server-only`
 * import above is what makes a mistake here a build error rather than a
 * leaked key.
 */
type DbClient = ReturnType<typeof createClient<Db>>

let client: DbClient | undefined

function getClient(): DbClient {
  client ??= createClient<Db>(
    requiredServerEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredServerEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } },
  )
  return client
}

/**
 * Resolve the client on first use rather than while Next collects route
 * configuration. This keeps `next build` and the public marketing page
 * usable on a clean checkout with no deployment secrets, while preserving the
 * same fail-fast error as soon as a database-backed request is handled.
 */
export const db = new Proxy({} as DbClient, {
  get(_target, property) {
    const value = Reflect.get(getClient(), property)
    return typeof value === 'function' ? value.bind(getClient()) : value
  },
})

export type Tables = Db['public']['Tables']
export type Views = Db['public']['Views']
