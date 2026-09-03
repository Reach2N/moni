/**
 * The filters every write inside `confirmPayment` carries.
 *
 * Confirming a payment is three writes: the payment goes pending to paid, and
 * the booking or the order goes pending to confirmed. Each one is scoped to the
 * row, to the shop, and to `status = 'pending'`, and all three parts are load
 * bearing:
 *
 *   - `id` alone would be a write addressed by a value that travels in URLs;
 *   - `business_id` is the ONLY tenancy wall this codebase has. RLS is deny-all
 *     with zero policies and the service role bypasses it, so a write that
 *     forgets its shop has nothing behind it to catch the mistake;
 *   - `status = 'pending'` is what makes the write idempotent. The owner taps
 *     "money arrived" from the inbox, from the money screen and through the
 *     agent, and a second tap must change zero rows and report `already_paid`
 *     rather than re-confirming a paid order and telling the customer twice.
 *
 * WHY THIS IS ITS OWN MODULE. `confirm.ts` is `server-only`, which means
 * `db/test.mjs` cannot import it: outside the `react-server` condition that
 * package resolves to a file that throws. The harness therefore used to assert
 * this rule by HAND WRITING the same UPDATE statement, which proved that
 * Postgres honours a where clause and nothing about `confirm.ts`. A reviewer
 * dropped `.eq('status', 'pending')` from the real code on 3 September 2026 and
 * every one of those assertions still passed.
 *
 * So the decision lives here, pure and with no `server-only`, the same shape as
 * `agent/instructions.ts` beside `prompt.ts` and `setup/plan.ts` beside
 * `persist.ts`. `confirm.ts` applies it through `applyScope` at all three call
 * sites, so the eq list cannot drift from the rule, and `db/test.mjs` builds
 * its SQL from this function rather than from a copy of it: delete a key here
 * and the harness goes red against real rows.
 */

/** Column to value, in the order they are applied. Every value is a string. */
export type ConfirmScope = Readonly<Record<string, string>>

/**
 * One pending row of one shop. Used for the payment, the order and the booking:
 * all three are the same rule, so they are the same function rather than three
 * hand-written chains that can disagree.
 */
export function confirmScope(id: string, businessId: string): ConfirmScope {
  return { id, business_id: businessId, status: 'pending' }
}

/** A query builder that can be narrowed by equality, which is all we need of it. */
type Filterable<Q> = { eq(column: string, value: string): Q }

/**
 * Applies a scope to a PostgREST filter builder.
 *
 * The point is that no call site spells its own `.eq()` chain, so dropping one
 * filter is not an edit anybody can make in `confirm.ts`: the only way to widen
 * a confirm write is to widen `confirmScope`, which the harness proves.
 */
export function applyScope<Q extends Filterable<Q>>(query: Q, scope: ConfirmScope): Q {
  let scoped = query
  for (const [column, value] of Object.entries(scope)) scoped = scoped.eq(column, value)
  return scoped
}
