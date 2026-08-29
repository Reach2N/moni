import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { auth, currentUser } from '@clerk/nextjs/server'
import { ApiRequestError } from '../http/post.ts'
import { findWaitlistEntry, resolveMemberBusiness } from '../queries/member.ts'
import { isApproved, normalizeEmail, passesGate } from './gate.ts'

export const SIGN_IN_PATH = '/sign-in'
export const APP_PATH = '/app'

/**
 * A member who is through the gate. `businessId` is the tenant key and the only
 * argument every query in `src/lib/queries/` needs: ARCHITECTURE.md section 2
 * puts tenancy in one server-side choke point instead of twenty RLS policies,
 * so this type is the wall. Never take a business id from a request body.
 */
export type Member = {
  clerkUserId: string
  email: string
  businessId: string
  slug: string
  name: string
  /** True when we approved the row by hand, as opposed to merely being on the list. */
  approved: boolean
  /** True on the sign-in that created the shop, which is what onboarding keys off. */
  isFirstVisit: boolean
}

export type MemberGate =
  | { status: 'signed_out' }
  | { status: 'refused'; email: string | null }
  | { status: 'member'; member: Member }

/**
 * Every verified address on the Clerk account, primary first.
 *
 * Verified only: an unverified address is a claim, not a fact, and the gate
 * reads an address to decide who someone is. Every address rather than just the
 * primary, because a member who applied with one address and then signed in
 * with Google under another is a real person we already accepted.
 */
function verifiedEmails(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>): string[] {
  const verified = user.emailAddresses.filter(
    (address) => address.verification?.status === 'verified',
  )
  const ordered = [
    ...verified.filter((address) => address.id === user.primaryEmailAddressId),
    ...verified.filter((address) => address.id !== user.primaryEmailAddressId),
  ]
  return ordered.map((address) => normalizeEmail(address.emailAddress))
}

/**
 * The gate, in one place. Sign-in is Clerk's; membership is ours.
 *
 * At launch this whole function collapses to "resolve the business", and the
 * refusal branch is deleted. That is the point of it living here and nowhere
 * else. PLAN.md Phase 2.
 *
 * Wrapped in React's `cache` so the gated layout and the page it renders share
 * one waitlist lookup per request instead of two, and so a member's shop is
 * never claimed twice in a single render.
 */
export const memberGate = cache(async function memberGate(): Promise<MemberGate> {
  const { userId } = await auth()
  if (!userId) return { status: 'signed_out' }

  const user = await currentUser()
  const emails = user ? verifiedEmails(user) : []
  if (emails.length === 0) return { status: 'refused', email: null }

  for (const email of emails) {
    const entry = await findWaitlistEntry(email)
    if (!passesGate(entry)) continue
    const business = await resolveMemberBusiness(userId, email)
    return {
      status: 'member',
      member: {
        clerkUserId: userId,
        email,
        businessId: business.id,
        slug: business.slug,
        name: business.name,
        approved: isApproved(entry),
        isFirstVisit: business.createdNow,
      },
    }
  }

  return { status: 'refused', email: emails[0] ?? null }
})

/**
 * For server components that are useless without a tenant. A refusal is a
 * screen, not an exception, so callers that can render one should use
 * `memberGate()` instead of this.
 */
export async function requireMember(): Promise<Member> {
  const gate = await memberGate()
  if (gate.status === 'signed_out') redirect(SIGN_IN_PATH)
  if (gate.status === 'refused') redirect(APP_PATH)
  return gate.member
}

/**
 * For route handlers. 401 means sign in, 403 means you are signed in and not on
 * the list: two different fixes, so two different codes. A Swift client reads
 * these the same way the browser does, which is the API-first rule.
 */
export async function requireMemberApi(): Promise<Member> {
  const gate = await memberGate()
  if (gate.status === 'signed_out') throw new ApiRequestError(401, 'sign in required')
  if (gate.status === 'refused') throw new ApiRequestError(403, 'this account is not on the founding shops list')
  return gate.member
}
