/**
 * How the inbox is ordered, as a rule rather than a SQL clause.
 *
 * Escalations first, because they are the only rows that need the owner at all;
 * everything else newest first, because that is how a shop reads its messages.
 * Postgres could do this with a CASE in the ORDER BY, but then the product rule
 * would live in a string and `db/test.mjs` could not prove it, so it lives here
 * with no `server-only` and the query just sorts.
 */
export type Orderable = { status: string; lastMessageAt: string }

export function sortInbox<T extends Orderable>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    const needsA = a.status === 'needs_owner' ? 0 : 1
    const needsB = b.status === 'needs_owner' ? 0 : 1
    if (needsA !== needsB) return needsA - needsB
    return b.lastMessageAt.localeCompare(a.lastMessageAt)
  })
}
