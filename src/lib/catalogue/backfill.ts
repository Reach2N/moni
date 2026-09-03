import { catalogKindFor, type BookingUnit } from '../types.ts'

/**
 * Whether one existing `services` row should move to `products`, and if not, why.
 *
 * Pure and separate from the script that runs it, so `db/test.mjs` can prove the
 * refusal that matters: a row any booking references is a commitment to a real
 * customer, and moving it either breaks a foreign key or orphans the booking.
 */
export type MovePlan = { move: boolean; reason: 'movable' | 'booked' | 'already correct' }

export function movePlan(row: {
  businessType: string
  unit: BookingUnit
  bookingCount: number
}): MovePlan {
  if (catalogKindFor(row.businessType, row.unit) !== 'product') {
    return { move: false, reason: 'already correct' }
  }
  if (row.bookingCount > 0) return { move: false, reason: 'booked' }
  return { move: true, reason: 'movable' }
}
