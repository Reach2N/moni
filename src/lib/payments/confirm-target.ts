/**
 * What a code the owner typed actually refers to.
 *
 * Booking codes and order codes come from two different generators over the
 * same alphabet, and nothing stops them producing the same six characters for
 * one business. `confirmPayment` moves money, so a guess here confirms the
 * wrong sale and tells the wrong customer her payment landed.
 *
 * So an ambiguous code is an OUTCOME, not a branch to pick a winner in. The
 * owner sees both and says which. This has never happened in production and
 * that is not a reason to leave it to chance: a collision is a birthday problem
 * on 36^6, and the cost of one is a customer who paid and a customer who did
 * not, both told the opposite.
 *
 * Pure and no `server-only`, so `db/test.mjs` proves the ambiguity rather than
 * the code carrying a comment claiming it.
 */
export type ConfirmTarget =
  | { kind: 'booking'; id: string }
  | { kind: 'order'; id: string }
  | { kind: 'ambiguous' }
  | { kind: 'none' }

export function confirmTarget(
  booking: { id: string } | null | undefined,
  order: { id: string } | null | undefined,
): ConfirmTarget {
  if (booking && order) return { kind: 'ambiguous' }
  if (booking) return { kind: 'booking', id: booking.id }
  if (order) return { kind: 'order', id: order.id }
  return { kind: 'none' }
}
