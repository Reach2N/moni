import 'server-only'
import { db } from '../db.ts'
import { requireDbData, isDatabaseConflict, throwIfDbError } from '../db-result.ts'
import {
  escapeLikePattern,
  normalizeEmail,
  slugAttempt,
  slugFromEmail,
  type WaitlistEntry,
} from '../auth/gate.ts'

/** Postgres unique_violation. A slug race, not a failure worth showing anyone. */
const UNIQUE_VIOLATION = '23505'

export type MemberBusiness = {
  id: string
  slug: string
  name: string
  createdNow: boolean
}

/**
 * The waitlist row for a signed-in email, or null. Case insensitive because the
 * unique index is on `lower(email)` and Clerk hands back whatever the member
 * typed.
 */
export async function findWaitlistEntry(email: string): Promise<WaitlistEntry | null> {
  const normalized = normalizeEmail(email)
  const result = await db
    .from('waitlist')
    .select('approved_at, converted_business_id')
    .ilike('email', escapeLikePattern(normalized))
    .maybeSingle()
  throwIfDbError('find waitlist entry', result.error)
  return result.data ?? null
}

/**
 * The tenant for a Clerk user id, creating one on first sign-in.
 *
 * `businesses.clerk_user_id` is deliberately not unique (the chain plan allows
 * several shops per owner), so the oldest row wins until a shop switcher exists.
 * Everything downstream takes this id as an argument: it is the whole of tenancy,
 * per ARCHITECTURE.md section 2, and the reason there are no RLS policies to get
 * wrong.
 */
export async function resolveMemberBusiness(clerkUserId: string, email: string): Promise<MemberBusiness> {
  const existing = await db
    .from('businesses')
    .select('id, slug, name')
    .eq('clerk_user_id', clerkUserId)
    .order('created_at')
    .limit(1)
    .maybeSingle()
  throwIfDbError('resolve member business', existing.error)
  if (existing.data) return { ...existing.data, createdNow: false }

  const created = await claimBusiness(clerkUserId, email)
  await linkWaitlistConversion(email, created.id)
  await recordClaim(created.id, clerkUserId, email)
  return { ...created, createdNow: true }
}

/**
 * A shop with nothing in it, so the member has somewhere to land the moment they
 * pass the gate. It is a placeholder in every field: onboarding (Phase 3) is
 * where the owner describes the shop and `raw_description` gets its first and
 * only write.
 */
async function claimBusiness(clerkUserId: string, email: string) {
  const base = slugFromEmail(email)
  const fallbackName = normalizeEmail(email).split('@')[0] || 'Moni shop'

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const insert = await db
      .from('businesses')
      .insert({
        clerk_user_id: clerkUserId,
        slug: slugAttempt(base, attempt),
        name: fallbackName.slice(0, 80),
      })
      .select('id, slug, name')
      .single()
    if (!insert.error) return requireDbData('claim business', insert)
    if (!isDatabaseConflict(insert.error, UNIQUE_VIOLATION)) {
      throwIfDbError('claim business', insert.error)
    }
  }
  throw new Error(`claim business: no free slug after 6 attempts from "${base}"`)
}

/** Closes the loop from application to live shop. Best effort: never blocks a sign-in. */
async function linkWaitlistConversion(email: string, businessId: string) {
  const result = await db
    .from('waitlist')
    .update({ converted_business_id: businessId })
    .ilike('email', escapeLikePattern(normalizeEmail(email)))
    .is('converted_business_id', null)
  if (result.error) console.error('[member] waitlist conversion not linked:', result.error.message)
}

async function recordClaim(businessId: string, clerkUserId: string, email: string) {
  const result = await db.from('events').insert({
    business_id: businessId,
    actor: 'owner',
    actor_label: 'owner via first sign-in',
    action: 'member.business_claimed',
    entity_type: 'business',
    entity_id: businessId,
    after: { clerk_user_id: clerkUserId, email: normalizeEmail(email) },
  })
  if (result.error) console.error('[member] claim not audited:', result.error.message)
}
