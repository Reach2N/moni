import 'server-only'
import postgres from 'postgres'
import type { Tx, TransactionRunner } from './tx.ts'

/**
 * The one direct Postgres connection in the codebase, used only where PostgREST
 * cannot go. Everything else still reads through `src/lib/db.ts`.
 *
 * `prepare: false` is not optional. Under Supavisor's transaction mode a pooled
 * connection is handed to a different client between statements, so named
 * prepared statements cannot be shared and the SECOND request to any route dies
 * with "prepared statement already exists". ARCHITECTURE.md calls this out as
 * the one configuration detail that will bite otherwise.
 */
let sql: ReturnType<typeof postgres> | undefined

function client() {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Orders and invoices need a real transaction, which PostgREST cannot provide. Use the Supavisor transaction mode (port 6543) connection string.',
    )
  }
  sql ??= postgres(url, { prepare: false, max: 3, idle_timeout: 20 })
  return sql
}

export const withTransaction: TransactionRunner = async (work) => {
  return client().begin(async (scoped) => {
    const tx: Tx = {
      query: async <T,>(text: string, params: readonly unknown[] = []) =>
        (await scoped.unsafe(text, params as never[])) as unknown as T[],
    }
    return work(tx)
  }) as never
}
