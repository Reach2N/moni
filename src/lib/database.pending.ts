import type { Database as Generated } from './database.types.ts'

/**
 * The promissory note, reopened. Phase 13.
 *
 * `database.types.ts` is GENERATED from the LIVE schema and is never hand
 * edited (CLAUDE.md). `db/schema.sql` and `supabase/migrations/` have grown
 * `payments.order_id`, and the live project has not been migrated to it yet, so
 * for exactly as long as that window is open the generated file is one column
 * behind the truth. `db.ts`'s own comment says what to do here: reopen this
 * file rather than edit the generated one.
 *
 * It is an OVERLAY and not a copy. It names one table and one column, so when
 * the migration is applied the fix is:
 *
 *   npx supabase gen types typescript --project-id roorkzxyoyacychgrktt --schema public
 *   ... then delete this file and point `db.ts` back at `database.types.ts`.
 *
 * A copied file would have to be diffed to find out what it was promising. This
 * one says it in twelve lines.
 */
type Tables = Generated['public']['Tables']
type Payments = Tables['payments']

type PendingPayments = Omit<Payments, 'Row' | 'Insert' | 'Update' | 'Relationships'> & {
  Row: Payments['Row'] & { order_id: string | null }
  Insert: Payments['Insert'] & { order_id?: string | null }
  Update: Payments['Update'] & { order_id?: string | null }
  Relationships: [
    ...Payments['Relationships'],
    {
      foreignKeyName: 'payments_order_id_fkey'
      columns: ['order_id']
      isOneToOne: false
      referencedRelation: 'orders'
      referencedColumns: ['id']
    },
  ]
}

export type Database = Omit<Generated, 'public'> & {
  public: Omit<Generated['public'], 'Tables'> & {
    Tables: Omit<Tables, 'payments'> & { payments: PendingPayments }
  }
}
