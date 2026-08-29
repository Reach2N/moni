/**
 * The transaction seam.
 *
 * `supabase-js` speaks to PostgREST, and PostgREST has no transactions. Two
 * operations in this product need one and cannot be faked: decrementing stock
 * while creating an order, and allocating a gapless per business invoice number.
 * ARCHITECTURE.md section 1 calls this a functional blocker rather than a matter
 * of taste, and it is right.
 *
 * So the logic takes a `Tx` and nothing else. In production that is postgres.js
 * over Supavisor; in `db/test.mjs` it is PGlite, which is the same Postgres
 * compiled to WASM. That means the assertions about atomicity run the REAL code
 * against a REAL Postgres, rather than a mock agreeing with itself.
 *
 * Deliberately a thin interface rather than Drizzle's query builder. Drizzle
 * sits on this exact driver, so adding it later changes no connection and no
 * SQL; ARCHITECTURE.md names drizzle-orm plus postgres, and this is the postgres
 * half, adopted where it is actually needed instead of as a repo-wide rewrite.
 */
export type Tx = {
  /** Parameterised, always. A template of user input is how a shop loses its data. */
  query<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<T[]>
}

export type TransactionRunner = <T>(work: (tx: Tx) => Promise<T>) => Promise<T>
