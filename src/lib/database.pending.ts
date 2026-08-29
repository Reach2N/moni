import type { Json } from './database.types.ts'

/**
 * Tables that exist in `db/schema.sql` but not yet in the GENERATED
 * `database.types.ts`.
 *
 * CLAUDE.md forbids hand editing the generated file, and rightly: it is
 * refreshed from the live schema with
 *   npx supabase gen types typescript --project-id roorkzxyoyacychgrktt --schema public
 * and any edit is lost on the next run without warning. But schema.sql moves
 * first during a build, and the live project is not migrated on every commit, so
 * there is a window where the code is correct and the generated types are stale.
 *
 * This file is that window, written down. Each entry lists the migration that
 * closes it. **Delete an entry the moment the generated types catch up**, and
 * delete this whole file when the list is empty. It is a promissory note, not a
 * second source of truth: if it ever disagrees with `db/schema.sql`, schema.sql
 * is right and this is a bug.
 */

/** Added by PLAN.md Phase 7. Migration: `storefronts`. */
type StorefrontsRow = {
  id: string
  theme: string
  draft: Json | null
  published: Json | null
  published_at: string | null
  generated_by: string | null
  created_at: string
  updated_at: string
}

type Insertable<T> = Partial<T> & { id: string }

export type PendingTables = {
  storefronts: {
    Row: StorefrontsRow
    Insert: Insertable<StorefrontsRow>
    Update: Partial<StorefrontsRow>
    Relationships: []
  }
}
